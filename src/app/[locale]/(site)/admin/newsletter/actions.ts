"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { campaignSchema, remainingFor, renderCampaign, sendNextBatches, versionFor, type CampaignInput } from "@/lib/newsletter-campaign";

const id = z.uuid();
/** Drafts may be incomplete: only lengths are checked until sending. */
const draftSchema = z.object({
  subjectAr: z.string().trim().max(150),
  bodyAr: z.string().trim().max(20000),
  subjectEn: z.string().trim().max(150),
  bodyEn: z.string().trim().max(20000),
  ctaLabelAr: z.string().trim().max(40),
  ctaLabelEn: z.string().trim().max(40),
  ctaUrl: z.string().trim().max(500),
});

type Result = { ok?: boolean; error?: string };

export async function createCampaign() {
  const admin = await requireAdmin("newsletter.send");
  const row = await db.newsletterCampaign.create({ data: { createdBy: admin.userId }, select: { id: true } });
  redirect(`/admin/newsletter/${row.id}`);
}

export async function saveCampaign(campaignId: string, input: CampaignInput): Promise<Result> {
  await requireAdmin("newsletter.send");
  const data = draftSchema.safeParse(input);
  if (!id.safeParse(campaignId).success || !data.success) return { error: "invalid" };
  const res = await db.newsletterCampaign.updateMany({ where: { id: campaignId, status: "draft" }, data: data.data });
  return res.count ? { ok: true } : { error: "not_draft" };
}

/** Live preview in the editor: the email exactly as a subscriber gets it (sample unsubscribe link). */
export async function previewCampaign(input: CampaignInput, lang: Locale): Promise<{ html: string } | null> {
  await requireAdmin("newsletter.send");
  const data = draftSchema.safeParse(input);
  if (!data.success) return null;
  const version = versionFor(data.data, lang);
  return version ? { html: renderCampaign(data.data, version, null).html } : null;
}

/** Sends each finished language version to the signed-in staff member. */
export async function sendTest(campaignId: string): Promise<Result> {
  const admin = await requireAdmin("newsletter.send");
  if (!id.safeParse(campaignId).success) return { error: "invalid" };
  const c = await db.newsletterCampaign.findUnique({ where: { id: campaignId } });
  if (!c) return { error: "invalid" };
  const langs = (["ar", "en"] as const).filter((l) => versionFor(c, l) === l);
  if (langs.length === 0) return { error: "empty" };
  if (!process.env.RESEND_API_KEY) return { error: "no_key" };
  const results = await Promise.all(
    langs.map((l) => {
      const { subject, html, text } = renderCampaign(c, l, null);
      return sendEmail({ to: admin.email, subject: `[TEST] ${subject}`, html, text });
    }),
  );
  return results.every(Boolean) ? { ok: true } : { error: "failed" };
}

/** Locks the issue (no more edits) and starts sending; the page then calls sendBatches until done. */
export async function startSending(campaignId: string): Promise<Result> {
  const admin = await requireAdmin("newsletter.send");
  if (!id.safeParse(campaignId).success) return { error: "invalid" };
  const c = await db.newsletterCampaign.findUnique({ where: { id: campaignId } });
  if (!c) return { error: "invalid" };
  const valid = campaignSchema.safeParse(c);
  if (!valid.success) return { error: valid.error.issues[0]?.message === "cta" ? "cta" : "empty" };
  if (!process.env.RESEND_API_KEY) return { error: "no_key" };
  const audience = await remainingFor(campaignId);
  if (audience === 0) return { error: "no_subscribers" };
  const started = await db.$transaction(async (tx) => {
    const res = await tx.newsletterCampaign.updateMany({ where: { id: campaignId, status: "draft" }, data: { status: "sending", startedAt: new Date() } });
    if (res.count) await audit(admin, "newsletter.send", { type: "newsletter_campaign", id: campaignId }, { subject: c.subjectAr || c.subjectEn, count: audience }, tx);
    return res.count > 0;
  });
  return started ? { ok: true } : { error: "not_draft" };
}

export async function sendBatches(campaignId: string) {
  await requireAdmin("newsletter.send");
  if (!id.safeParse(campaignId).success) return { sent: 0, failed: 0, remaining: 0, done: false, error: "not_sending" as const };
  return sendNextBatches(campaignId);
}

/** Puts failed deliveries back in the queue and resumes sending. */
export async function retryFailed(campaignId: string): Promise<Result> {
  const admin = await requireAdmin("newsletter.send");
  if (!id.safeParse(campaignId).success) return { error: "invalid" };
  const ok = await db.$transaction(async (tx) => {
    const removed = await tx.newsletterDelivery.deleteMany({ where: { campaignId, status: "failed" } });
    if (!removed.count) return false;
    await tx.newsletterCampaign.update({ where: { id: campaignId }, data: { status: "sending", failedCount: { decrement: removed.count } } });
    await audit(admin, "newsletter.retry", { type: "newsletter_campaign", id: campaignId }, { count: removed.count }, tx);
    return true;
  });
  return ok ? { ok: true } : { error: "invalid" };
}

export async function deleteDraft(campaignId: string) {
  await requireAdmin("newsletter.send");
  if (id.safeParse(campaignId).success) await db.newsletterCampaign.deleteMany({ where: { id: campaignId, status: "draft" } });
  redirect("/admin/newsletter");
}
