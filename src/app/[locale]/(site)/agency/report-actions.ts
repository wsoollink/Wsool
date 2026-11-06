"use server";

import { z } from "zod";
import { addPosts, createReport, ownedPost, ownedReport, readPost, renewReportLink } from "@/lib/ad-reports";
import { requireAgency } from "@/lib/agency";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { newReportSchema, reportItemsSchema } from "@/lib/validation/ad-reports";

/**
 * Agency ad reports (editors and up, agencies only): posts of linked creators who gave the "content" permission, read
 * through each creator's own linked account (checked in src/lib/ad-reports.ts for every post).
 */
async function owner() {
  const m = await requireAgency("editor");
  if (m.agency.kind !== "agency") throw new Error("not an agency");
  return { m, own: { agencyId: m.agency.id } };
}
const uuid = (v: string) => z.uuid().safeParse(v).success;

export async function createAgencyReport(input: unknown) {
  const { m, own } = await owner();
  const parsed = newReportSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  if (!(await rateLimit(`ad-report-agency:${m.agency.id}`, 60, 3600))) return { error: "rate" };
  const res = await createReport(own, m.member.userId ?? m.agency.id, parsed.data);
  if ("id" in res && res.id) return { ok: true as const, id: res.id, errors: res.errors };
  return { error: res.error, errors: res.errors };
}

export async function addAgencyReportPosts(reportId: string, items: unknown) {
  const { m, own } = await owner();
  const parsed = reportItemsSchema.safeParse(items);
  if (!uuid(reportId) || !parsed.success || !(await ownedReport(own, reportId))) return { error: "invalid" };
  if (!(await rateLimit(`ad-report-agency:${m.agency.id}`, 60, 3600))) return { error: "rate" };
  const res = await addPosts(own, reportId, parsed.data);
  return { ok: true as const, errors: res.errors };
}

export async function removeAgencyReportPost(postId: string) {
  const { own } = await owner();
  if (!uuid(postId) || !(await ownedPost(own, postId))) return { error: "invalid" };
  await db.adReportPost.delete({ where: { id: postId } });
  return { ok: true as const };
}

export async function refreshAgencyReportPost(postId: string) {
  const { m, own } = await owner();
  if (!uuid(postId) || !(await ownedPost(own, postId))) return { error: "invalid" };
  if (!(await rateLimit(`ad-report-refresh-agency:${m.agency.id}`, 40, 600))) return { error: "rate" };
  const error = await readPost(postId);
  return error ? { error } : { ok: true as const };
}

export async function renewAgencyReportLink(reportId: string) {
  const { own } = await owner();
  if (!uuid(reportId) || !(await ownedReport(own, reportId))) return { error: "invalid" };
  return { ok: true as const, token: await renewReportLink(reportId) };
}

export async function revokeAgencyReportLink(reportId: string) {
  const { own } = await owner();
  if (!uuid(reportId) || !(await ownedReport(own, reportId))) return { error: "invalid" };
  await db.adReport.update({ where: { id: reportId }, data: { revokedAt: new Date() } });
  return { ok: true as const };
}

export async function deleteAgencyReport(reportId: string) {
  const { own } = await owner();
  if (!uuid(reportId) || !(await ownedReport(own, reportId))) return { error: "invalid" };
  await db.adReport.delete({ where: { id: reportId } });
  return { ok: true as const };
}
