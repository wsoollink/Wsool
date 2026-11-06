"use server";

import { z } from "zod";
import { hasPro } from "@/config/plans";
import { addPosts, createReport, ownedPost, ownedReport, renewReportLink, readPost, type PostError } from "@/lib/ad-reports";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { newReportSchema, reportItemsSchema } from "@/lib/validation/ad-reports";

type Result = { ok?: true; id?: string; error?: string; errors?: { url: string; error: PostError }[] };

/** Unscoped on purpose: an agency acting for this creator can't use it (agencies make reports from their own tab). */
async function owner() {
  const { page } = await requireCreator();
  const sub = await db.subscription.findUnique({ where: { userId: page.userId }, select: { status: true, trialEndsAt: true } });
  return { page, pro: hasPro(sub) };
}

export async function createAdReport(input: unknown): Promise<Result> {
  const { page, pro } = await owner();
  if (!pro) return { error: "pro" };
  const parsed = newReportSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  // Each post is read from the platform right away: keep it to a sensible pace.
  if (!(await rateLimit(`ad-report:${page.userId}`, 30, 3600))) return { error: "rate" };
  const res = await createReport({ pageId: page.id, userId: page.userId }, page.userId, parsed.data);
  if ("id" in res && res.id) return { ok: true, id: res.id, errors: res.errors };
  return { error: res.error, errors: res.errors };
}

export async function addAdReportPosts(reportId: string, items: unknown): Promise<Result> {
  const { page, pro } = await owner();
  if (!pro) return { error: "pro" };
  const parsed = reportItemsSchema.safeParse(items);
  const own = { pageId: page.id, userId: page.userId };
  if (!z.uuid().safeParse(reportId).success || !parsed.success || !(await ownedReport(own, reportId))) return { error: "invalid" };
  if (!(await rateLimit(`ad-report:${page.userId}`, 30, 3600))) return { error: "rate" };
  const res = await addPosts(own, reportId, parsed.data);
  return { ok: true, errors: res.errors };
}

export async function removeAdReportPost(postId: string): Promise<Result> {
  const { page } = await owner();
  if (!z.uuid().safeParse(postId).success || !(await ownedPost({ pageId: page.id, userId: page.userId }, postId))) return { error: "invalid" };
  await db.adReportPost.delete({ where: { id: postId } });
  return { ok: true };
}

/** "Update now" for one post (at most every 10 minutes per creator, on top of the daily update). */
export async function refreshAdReportPost(postId: string): Promise<Result> {
  const { page } = await owner();
  if (!z.uuid().safeParse(postId).success || !(await ownedPost({ pageId: page.id, userId: page.userId }, postId))) return { error: "invalid" };
  if (!(await rateLimit(`ad-report-refresh:${page.userId}`, 20, 600))) return { error: "rate" };
  const error = await readPost(postId);
  return error ? { error } : { ok: true };
}

export async function renewAdReportLink(reportId: string): Promise<Result & { token?: string }> {
  const { page } = await owner();
  if (!z.uuid().safeParse(reportId).success || !(await ownedReport({ pageId: page.id, userId: page.userId }, reportId))) return { error: "invalid" };
  return { ok: true, token: await renewReportLink(reportId) };
}

export async function revokeAdReportLink(reportId: string): Promise<Result> {
  const { page } = await owner();
  if (!z.uuid().safeParse(reportId).success || !(await ownedReport({ pageId: page.id, userId: page.userId }, reportId))) return { error: "invalid" };
  await db.adReport.update({ where: { id: reportId }, data: { revokedAt: new Date() } });
  return { ok: true };
}

export async function deleteAdReport(reportId: string): Promise<Result> {
  const { page } = await owner();
  if (!z.uuid().safeParse(reportId).success || !(await ownedReport({ pageId: page.id, userId: page.userId }, reportId))) return { error: "invalid" };
  await db.adReport.delete({ where: { id: reportId } });
  return { ok: true };
}
