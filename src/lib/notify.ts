import "server-only";
import { createTranslator } from "use-intl/core";
import type { Prisma } from "@/generated/prisma/client";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { renderEmail } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { formatPrice } from "@/lib/format";
import { siteOrigin } from "@/lib/site-url";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

/**
 * Every notification Wsool sends (in the bell and by email). Texts live in
 * messages/*.json under "Notify.<type>" (subject, title, body, cta).
 * Reminders respect the creator's email settings; the rest is always sent.
 */
export const NOTIFICATIONS = {
  welcome: { href: "/dashboard", reminder: false },
  trial_reminder: { href: "/dashboard/subscription", reminder: true },
  trial_ended: { href: "/dashboard/subscription", reminder: false },
  payment_receipt: { href: "/dashboard/subscription", reminder: false },
  renewal_receipt: { href: "/dashboard/subscription", reminder: false },
  renewal_upcoming: { href: "/dashboard/subscription", reminder: false },
  payment_failed: { href: "/dashboard/subscription", reminder: false },
  subscription_ended: { href: "/dashboard/subscription", reminder: false },
  refund_issued: { href: "/dashboard/subscription", reminder: false },
  verification_approved: { href: "/dashboard/verification", reminder: false },
  verification_rejected: { href: "/dashboard/verification", reminder: false },
  verification_expiring: { href: "/dashboard/verification", reminder: true },
  verification_expired: { href: "/dashboard/verification", reminder: false },
  deletion_scheduled: { href: "/dashboard/subscription", reminder: false },
} as const;
export type NotificationType = keyof typeof NOTIFICATIONS;

type Data = Record<string, string | number | null | undefined>;
const MESSAGES = { ar, en } as const;

/**
 * Formats raw values for one language: keys ending in "Date" are ISO dates,
 * "amount" + "currency" become a price, "reason" a preset rejection reason.
 */
function present(data: Data, lang: Locale): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long" });
  const reasons = createTranslator({ locale: toIntlLocale(lang), messages: MESSAGES[lang], namespace: "VerificationPage.reasons" });
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) continue;
    if (k.endsWith("Date") && typeof v === "string") out[k] = date.format(new Date(v));
    else if (k === "reason" && typeof v === "string") out[k] = reasons.has(v as never) ? reasons(v as never) : v;
    // "@handle" kept left-to-right inside Arabic text (Unicode isolate).
    else if (k === "handle") out[k] = `\u2066@${v}\u2069`;
    else out[k] = v;
  }
  if (typeof data.amount === "number" && (data.currency === "SAR" || data.currency === "USD")) out.amount = formatPrice(data.amount, data.currency, lang);
  return out;
}

/** Title + body of a notification in one language (also used by the bell list). */
export function notificationText(type: string, data: unknown, lang: Locale) {
  const t = createTranslator({ locale: toIntlLocale(lang), messages: MESSAGES[lang], namespace: "Notify" });
  if (!(type in NOTIFICATIONS)) return null;
  const values = present((data ?? {}) as Data, lang);
  const key = type as NotificationType;
  return { title: t(`${key}.title`, values), body: t(`${key}.body`, values), href: NOTIFICATIONS[key].href };
}

function emailFor(type: NotificationType, data: Data, lang: Locale, footer: string) {
  const t = createTranslator({ locale: toIntlLocale(lang), messages: MESSAGES[lang], namespace: "Notify" });
  const values = present(data, lang);
  const body = t(`${type}.body`, values);
  const content = renderEmail({
    lang,
    preheader: body.split("\n")[0],
    title: t(`${type}.title`, values),
    paragraphs: body.split("\n").filter(Boolean),
    cta: { label: t(`${type}.cta`), url: `${siteOrigin()}${NOTIFICATIONS[type].href}` },
    footer,
  });
  return { subject: t(`${type}.subject`, values), ...content };
}

/**
 * Notifies a creator: adds it to their bell and emails it in their page's
 * language. With a dedupeKey the same notification is never sent twice (safe
 * for hourly reminder jobs). Never throws.
 */
export async function notify(userId: string, type: NotificationType, data: Data = {}, opts: { dedupeKey?: string } = {}) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, page: { select: { primaryLang: true } }, notificationSettings: true },
    });
    if (!user) return;
    try {
      await db.notification.create({ data: { userId, type, data: data as Prisma.InputJsonValue, dedupeKey: opts.dedupeKey ?? null } });
    } catch (err) {
      // Unique (user, dedupeKey): already sent.
      if ((err as { code?: string }).code === "P2002") return;
      throw err;
    }
    if (NOTIFICATIONS[type].reminder && user.notificationSettings?.emailReminders === false) return;
    const lang = (user.page?.primaryLang ?? "ar") as Locale;
    const footer = createTranslator({ locale: toIntlLocale(lang), messages: MESSAGES[lang], namespace: "Notify" })("footer");
    await sendEmail({ to: user.email, ...emailFor(type, data, lang, footer) });
  } catch (err) {
    console.error("[notify] failed", type, err);
  }
}

/** Renders an email without sending it (scripts/preview-emails.ts). */
export function previewEmail(type: NotificationType, data: Data, lang: Locale) {
  const footer = createTranslator({ locale: toIntlLocale(lang), messages: MESSAGES[lang], namespace: "Notify" })("footer");
  return emailFor(type, data, lang, footer);
}

/** Team invitation: the invitee may not have an account yet, so email only. */
export async function sendTeamInvite(email: string, role: string, lang: Locale = "ar") {
  const t = createTranslator({ locale: toIntlLocale(lang), messages: MESSAGES[lang], namespace: "Notify.team_invite" });
  const roleName = createTranslator({ locale: toIntlLocale(lang), messages: MESSAGES[lang], namespace: "Admin.team.roles" });
  const values = { role: roleName.has(role as never) ? roleName(role as never) : role, email };
  const content = renderEmail({
    lang, preheader: t("body", values), title: t("title", values), paragraphs: t("body", values).split("\n"),
    cta: { label: t("cta"), url: `${siteOrigin()}/login` }, footer: t("footer"),
  });
  await sendEmail({ to: email, subject: t("subject", values), ...content });
}
