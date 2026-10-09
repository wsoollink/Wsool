import "server-only";
import { createTranslator } from "use-intl/core";
import { z } from "zod";
import type { NewsletterCampaign } from "@/generated/prisma/client";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { renderEmail } from "@/lib/email/layout";
import { BATCH_SIZE, sendBatch, type Email } from "@/lib/email/send";
import { unsubscribeUrl } from "@/lib/newsletter";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

/** Editable fields of an issue (admin form). At least one language must be complete. */
export const campaignSchema = z
  .object({
    subjectAr: z.string().trim().max(150),
    bodyAr: z.string().trim().max(20000),
    subjectEn: z.string().trim().max(150),
    bodyEn: z.string().trim().max(20000),
    ctaLabelAr: z.string().trim().max(40),
    ctaLabelEn: z.string().trim().max(40),
    ctaUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(500)]),
  })
  .refine((c) => !!(c.subjectAr && c.bodyAr) || !!(c.subjectEn && c.bodyEn), { message: "empty" })
  // A button needs its link, and a link needs a label in every language that is filled in.
  .refine((c) => !c.ctaUrl || ((!c.bodyAr || !!c.ctaLabelAr) && (!c.bodyEn || !!c.ctaLabelEn)), { message: "cta" })
  .refine((c) => !(c.ctaLabelAr || c.ctaLabelEn) || !!c.ctaUrl, { message: "cta" });

export type CampaignInput = z.input<typeof campaignSchema>;
type Content = Pick<NewsletterCampaign, keyof CampaignInput>;

/** The version a subscriber gets: their language when it's complete, else the other one. */
export function versionFor(c: Content, lang: Locale): Locale | null {
  const done = (l: Locale) => (l === "ar" ? !!(c.subjectAr && c.bodyAr) : !!(c.subjectEn && c.bodyEn));
  if (done(lang)) return lang;
  const other = lang === "ar" ? "en" : "ar";
  return done(other) ? other : null;
}

/** The finished email for one language; `subscriberId` fills the personal unsubscribe link. */
export function renderCampaign(c: Content, lang: Locale, subscriberId: string | null) {
  const subject = lang === "ar" ? c.subjectAr : c.subjectEn;
  const body = lang === "ar" ? c.bodyAr : c.bodyEn;
  const ctaLabel = lang === "ar" ? c.ctaLabelAr : c.ctaLabelEn;
  const t = createTranslator({ locale: toIntlLocale(lang), messages: lang === "ar" ? ar : en, namespace: "Newsletter.campaign" });
  const unsubscribe = subscriberId ? unsubscribeUrl(subscriberId) : t("unsubscribeSample");
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const content = renderEmail({
    lang,
    preheader: paragraphs[0]?.replace(/\s+/g, " ").slice(0, 110) ?? "",
    title: subject,
    paragraphs,
    cta: c.ctaUrl && ctaLabel ? { label: ctaLabel, url: c.ctaUrl } : undefined,
    footer: t("footer", { url: unsubscribe }),
  });
  return { subject, ...content };
}

const oneClick = (subscriberId: string) => ({
  "List-Unsubscribe": `<${unsubscribeUrl(subscriberId).replace("/newsletter/", "/api/newsletter/")}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

/** Subscriber counts for the admin page. */
export async function audienceCounts() {
  const rows = await db.newsletterSubscriber.groupBy({ by: ["status", "lang"], _count: true });
  const n = (status?: string, lang?: string) =>
    rows.filter((r) => (!status || r.status === status) && (!lang || r.lang === lang)).reduce((s, r) => s + r._count, 0);
  return { confirmed: n("confirmed"), ar: n("confirmed", "ar"), en: n("confirmed", "en"), pending: n("pending"), unsubscribed: n("unsubscribed") };
}

/** Confirmed subscribers this issue hasn't reached yet. */
export const remainingFor = (campaignId: string) =>
  db.newsletterSubscriber.count({ where: { status: "confirmed", deliveries: { none: { campaignId } } } });

export type BatchResult = { sent: number; failed: number; remaining: number; done: boolean; error?: "no_key" | "not_sending" };

/**
 * Sends the next batches of a campaign that is `sending` (about 300 emails per
 * call, so one request stays short). Each subscriber is claimed with a
 * delivery row before the email goes out, so two tabs or a resumed send never
 * email anyone twice. When nobody is left the campaign becomes `sent`.
 */
export async function sendNextBatches(campaignId: string, rounds = 3): Promise<BatchResult> {
  const campaign = await db.newsletterCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "sending") return { sent: 0, failed: 0, remaining: 0, done: campaign?.status === "sent", error: "not_sending" };
  let sent = 0, failed = 0;

  for (let round = 0; round < rounds; round++) {
    const next = await db.newsletterSubscriber.findMany({
      where: { status: "confirmed", deliveries: { none: { campaignId } } },
      orderBy: { confirmedAt: "asc" },
      take: BATCH_SIZE,
      select: { id: true, email: true, lang: true },
    });
    if (next.length === 0) break;

    // Claim: only the rows this call inserted are ours to send.
    const claimed = new Set(
      (
        await db.$queryRaw<{ subscriber_id: string }[]>`
          INSERT INTO newsletter_deliveries (campaign_id, subscriber_id)
          SELECT ${campaignId}::uuid, unnest(${next.map((s) => s.id)}::uuid[])
          ON CONFLICT DO NOTHING RETURNING subscriber_id`
      ).map((r) => r.subscriber_id),
    );
    const batch = next.filter((s) => claimed.has(s.id));
    if (batch.length === 0) continue;

    const emails: Email[] = batch.map((s) => {
      const lang = versionFor(campaign, s.lang) ?? "ar";
      const { subject, html, text } = renderCampaign(campaign, lang, s.id);
      return { to: s.email, subject, html, text, headers: oneClick(s.id) };
    });
    const result = await sendBatch(emails);
    if (result === "no_key") {
      // Nothing went out: release the claims so the send can resume once the key is set.
      await db.newsletterDelivery.deleteMany({ where: { campaignId, subscriberId: { in: batch.map((s) => s.id) } } });
      return { sent, failed, remaining: await remainingFor(campaignId), done: false, error: "no_key" };
    }
    const ok = result === "ok";
    await db.$transaction([
      db.newsletterDelivery.updateMany({ where: { campaignId, subscriberId: { in: batch.map((s) => s.id) } }, data: { status: ok ? "sent" : "failed" } }),
      db.newsletterCampaign.update({ where: { id: campaignId }, data: ok ? { sentCount: { increment: batch.length } } : { failedCount: { increment: batch.length } } }),
    ]);
    if (ok) sent += batch.length;
    else failed += batch.length;
  }

  const remaining = await remainingFor(campaignId);
  if (remaining === 0) await db.newsletterCampaign.updateMany({ where: { id: campaignId, status: "sending" }, data: { status: "sent", sentAt: new Date() } });
  return { sent, failed, remaining, done: remaining === 0 };
}
