import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createTranslator } from "use-intl/core";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { renderEmail } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { siteOrigin } from "@/lib/site-url";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

/**
 * Newsletter with double opt-in (CLAUDE.md section 11, phase 6): an address is
 * added only after it confirms. Every email carries an unsubscribe link; the
 * links hold an HMAC of the subscriber id, so no token is stored.
 */
const secret = () => process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "local";
const sign = (purpose: "confirm" | "unsubscribe", id: string) =>
  createHmac("sha256", secret()).update(`newsletter:${purpose}:${id}`).digest("base64url").slice(0, 32);

export function verifyLink(purpose: "confirm" | "unsubscribe", id: string, token: string) {
  const expected = Buffer.from(sign(purpose, id));
  const given = Buffer.from(String(token ?? ""));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const confirmUrl = (id: string) => `${siteOrigin()}/newsletter/confirm?id=${id}&t=${sign("confirm", id)}`;
export const unsubscribeUrl = (id: string) => `${siteOrigin()}/newsletter/unsubscribe?id=${id}&t=${sign("unsubscribe", id)}`;

/** Don't send another confirmation to the same address within this time. */
const RESEND_AFTER_MS = 10 * 60_000;

/**
 * Signs an address up (pending) and sends the confirmation email. The answer
 * is the same whether the address is new, pending or already confirmed, so
 * the form never reveals who is subscribed.
 */
export async function subscribe(email: string, lang: Locale, source: string) {
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === "confirmed") return;
  if (existing?.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < RESEND_AFTER_MS) return;
  const row = existing
    ? await db.newsletterSubscriber.update({ where: { id: existing.id }, data: { status: "pending", lang, source, confirmSentAt: new Date(), unsubscribedAt: null } })
    : await db.newsletterSubscriber.create({ data: { email, lang, source, confirmSentAt: new Date() } });

  const t = createTranslator({ locale: toIntlLocale(lang), messages: lang === "ar" ? ar : en, namespace: "Newsletter.email" });
  const content = renderEmail({
    lang, preheader: t("preheader"), title: t("title"), paragraphs: [t("body"), t("ignore")],
    cta: { label: t("cta"), url: confirmUrl(row.id) },
    footer: t("footer", { url: unsubscribeUrl(row.id) }),
  });
  await sendEmail({
    to: email, subject: t("subject"), ...content,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl(row.id).replace("/newsletter/", "/api/newsletter/")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
}

export async function confirm(id: string) {
  const row = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!row || row.status === "unsubscribed") return row?.status === "unsubscribed" ? "unsubscribed" : "invalid";
  if (row.status === "pending") await db.newsletterSubscriber.update({ where: { id }, data: { status: "confirmed", confirmedAt: new Date() } });
  return "confirmed";
}

export async function unsubscribe(id: string) {
  const row = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!row) return false;
  if (row.status !== "unsubscribed") await db.newsletterSubscriber.update({ where: { id }, data: { status: "unsubscribed", unsubscribedAt: new Date() } });
  return true;
}
