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
import { legacySigningKey, signingKey } from "@/lib/signing";

/**
 * Newsletter with double opt-in (CLAUDE.md section 11, phase 6): an address is
 * added only after it confirms. Every email carries an unsubscribe link; the
 * links hold an HMAC of the subscriber id, so no token is stored.
 *
 * Two lists (owner, Nov 2026): `creators` and `agencies` (columns on the
 * subscriber row: true = on it, false = left it, null = never on it). The
 * account emails of creators and agency members are added automatically by
 * syncLists(); someone who left a list is never added back except by
 * themselves (dashboard switch or a new sign-up).
 */
export const NEWSLETTER_LISTS = ["creators", "agencies"] as const;
export type NewsletterList = (typeof NEWSLETTER_LISTS)[number];
/** What an unsubscribe link removes: one list, or all of them (issues sent to everyone, and old links). */
export type UnsubscribeScope = NewsletterList | "all";


// Links from before the lists carry no list: "confirm" = creators list, "unsubscribe" = all lists.
const purposeOf = (kind: "confirm" | "unsubscribe", scope: string | null) => (scope ? `${kind}:${scope}` : kind);
const sign = (purpose: string, id: string, key = signingKey("newsletter")) =>
  createHmac("sha256", key).update(`newsletter:${purpose}:${id}`).digest("base64url").slice(0, 32);

const SCOPES: Record<"confirm" | "unsubscribe", readonly string[]> = { confirm: NEWSLETTER_LISTS, unsubscribe: [...NEWSLETTER_LISTS, "all"] };

/** Checks a link's token; returns the list it acts on, or null when the link is not valid. */
export function verifyLink(kind: "confirm", id: string, token: string, scope?: string | null): NewsletterList | null;
export function verifyLink(kind: "unsubscribe", id: string, token: string, scope?: string | null): UnsubscribeScope | null;
export function verifyLink(kind: "confirm" | "unsubscribe", id: string, token: string, scope?: string | null): UnsubscribeScope | null {
  const l = scope || null;
  if (l && !SCOPES[kind].includes(l)) return null;
  const given = Buffer.from(String(token ?? ""));
  // Links already in inboxes may be signed with the key from before SIGNING_SECRET.
  const old = legacySigningKey();
  const keys = old ? [signingKey("newsletter"), old] : [signingKey("newsletter")];
  const ok = keys.some((key) => {
    const expected = Buffer.from(sign(purposeOf(kind, l), id, key));
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!ok) return null;
  return (l ?? (kind === "confirm" ? "creators" : "all")) as UnsubscribeScope;
}

export const confirmUrl = (id: string, list: NewsletterList) =>
  `${siteOrigin()}/newsletter/confirm?id=${id}&l=${list}&t=${sign(purposeOf("confirm", list), id)}`;
export const unsubscribeUrl = (id: string, scope: UnsubscribeScope) =>
  `${siteOrigin()}/newsletter/unsubscribe?id=${id}&l=${scope}&t=${sign(purposeOf("unsubscribe", scope), id)}`;
/** One-click unsubscribe (RFC 8058) headers for an email. */
export const oneClickHeaders = (id: string, scope: UnsubscribeScope) => ({
  "List-Unsubscribe": `<${unsubscribeUrl(id, scope).replace("/newsletter/", "/api/newsletter/")}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

/** Don't send another confirmation to the same address within this time. */
const RESEND_AFTER_MS = 10 * 60_000;

/**
 * Signs an address up to a list and sends the confirmation email. The answer
 * is the same whether the address is new, pending or already confirmed, so
 * the form never reveals who is subscribed.
 */
export async function subscribe(email: string, lang: Locale, source: string, list: NewsletterList = "creators") {
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === "confirmed" && existing[list] === true) return;
  if (existing?.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < RESEND_AFTER_MS) return;
  const row = existing
    ? await db.newsletterSubscriber.update({
        where: { id: existing.id },
        // A confirmed address joining another list stays confirmed for the lists it's on.
        data: existing.status === "confirmed" ? { confirmSentAt: new Date() } : { status: "pending", lang, source, confirmSentAt: new Date() },
      })
    : await db.newsletterSubscriber.create({ data: { email, lang, source, confirmSentAt: new Date() } });

  const t = createTranslator({ locale: toIntlLocale(lang), messages: lang === "ar" ? ar : en, namespace: "Newsletter.email" });
  const content = renderEmail({
    lang, preheader: t("preheader"), title: t("title"), paragraphs: [t(list === "agencies" ? "bodyAgencies" : "body"), t("ignore")],
    cta: { label: t("cta"), url: confirmUrl(row.id, list) },
    footer: t("footer", { url: unsubscribeUrl(row.id, list) }),
  });
  await sendEmail({ to: email, subject: t("subject"), ...content, headers: oneClickHeaders(row.id, list) });
}

export async function confirm(id: string, list: NewsletterList) {
  const row = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!row) return "invalid";
  // An old confirmation link can't undo a later unsubscribe.
  if (row[list] === false && row.unsubscribedAt && (!row.confirmSentAt || row.confirmSentAt < row.unsubscribedAt)) return "unsubscribed";
  await db.newsletterSubscriber.update({
    where: { id },
    data: { status: "confirmed", confirmedAt: row.confirmedAt ?? new Date(), [list]: true },
  });
  return "confirmed";
}

export async function unsubscribe(id: string, scope: UnsubscribeScope) {
  const row = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!row) return false;
  const lists = { creators: scope === "all" || scope === "creators" ? false : row.creators, agencies: scope === "all" || scope === "agencies" ? false : row.agencies };
  const onAny = lists.creators === true || lists.agencies === true;
  await db.newsletterSubscriber.update({
    where: { id },
    data: { ...lists, unsubscribedAt: new Date(), ...(onAny ? {} : { status: "unsubscribed" as const }) },
  });
  return true;
}

/**
 * Adds the account emails of creators (live, not suspended pages) and of agency
 * members (active agencies) to their list. Only addresses that were never on
 * that list are touched (null): whoever left a list stays out. A creator who had
 * switched "Wsool news" off before the lists existed starts outside the list.
 * Runs before counting or sending (admin newsletter pages); a few statements, fine for thousands.
 */
export async function syncLists() {
  await db.$executeRaw`
    INSERT INTO newsletter_subscribers (id, email, lang, status, source, confirmed_at, creators)
    SELECT DISTINCT ON (lower(u.email)) gen_random_uuid(), lower(u.email), p.primary_lang, 'confirmed', 'account', now(), coalesce(ns.email_product_news, true)
    FROM users u
    JOIN pages p ON p.user_id = u.id
    LEFT JOIN notification_settings ns ON ns.user_id = u.id
    WHERE p.deleted_at IS NULL AND u.suspended_at IS NULL AND NOT u.placeholder
    ON CONFLICT (email) DO UPDATE SET
      creators = EXCLUDED.creators,
      status = CASE WHEN EXCLUDED.creators THEN 'confirmed'::"NewsletterStatus" ELSE newsletter_subscribers.status END,
      confirmed_at = CASE WHEN EXCLUDED.creators THEN coalesce(newsletter_subscribers.confirmed_at, now()) ELSE newsletter_subscribers.confirmed_at END
    WHERE newsletter_subscribers.creators IS NULL`;
  await db.$executeRaw`
    INSERT INTO newsletter_subscribers (id, email, lang, status, source, confirmed_at, agencies)
    SELECT DISTINCT ON (lower(m.email)) gen_random_uuid(), lower(m.email), 'ar', 'confirmed', 'agency', now(), true
    FROM agency_members m
    JOIN agencies a ON a.id = m.agency_id
    -- Only members who signed in (an invite typed by someone else is not consent), not suspended.
    JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
    WHERE a.status = 'active'
    ON CONFLICT (email) DO UPDATE SET
      agencies = true, status = 'confirmed', confirmed_at = coalesce(newsletter_subscribers.confirmed_at, now())
    WHERE newsletter_subscribers.agencies IS NULL`;
}

/** Whether an account email is on a list (dashboard switch). Not on the list yet but never left = on (added on the next sync). */
export async function onList(email: string, list: NewsletterList, fallback = true) {
  const row = await db.newsletterSubscriber.findUnique({ where: { email: email.toLowerCase() }, select: { status: true, creators: true, agencies: true } });
  const v = row?.[list];
  return v == null ? fallback : v && row?.status === "confirmed";
}

/** The dashboard switch: an account email is already confirmed (signed in), so no confirmation email. */
export async function setList(email: string, list: NewsletterList, on: boolean, lang: Locale) {
  const addr = email.toLowerCase();
  const row = await db.newsletterSubscriber.findUnique({ where: { email: addr } });
  if (!row) {
    await db.newsletterSubscriber.create({
      data: { email: addr, lang, source: "account", [list]: on, ...(on ? { status: "confirmed", confirmedAt: new Date() } : { status: "unsubscribed", unsubscribedAt: new Date() }) },
    });
    return;
  }
  if (!on) return void (await unsubscribe(row.id, list));
  await db.newsletterSubscriber.update({ where: { id: row.id }, data: { [list]: true, status: "confirmed", confirmedAt: row.confirmedAt ?? new Date() } });
}
