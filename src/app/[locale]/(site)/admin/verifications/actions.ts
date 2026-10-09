"use server";

import { updateTag } from "next/cache";
import { PLATFORM_NAMES } from "@/config/platforms";
import { LICENSE_REJECT_REASONS, REJECT_REASONS, REVIEW_CHECKS, VERIFICATION_DAYS } from "@/config/verification";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { pageCacheTag } from "@/lib/public-page";

export type DecisionResult = { ok?: boolean; error?: "failed" | "checks" | "already_decided" };

async function loadPending(requestId: string) {
  return db.verificationRequest.findFirst({
    where: { id: String(requestId), status: "pending" },
    include: { account: { select: { id: true, verificationStatus: true, verifiedUntil: true, page: { select: { username: true, userId: true } } } } },
  });
}

/** Approves a request; all three review checks must be ticked. Valid for VERIFICATION_DAYS. */
export async function approveVerification(requestId: string, checks: string[]): Promise<DecisionResult> {
  const admin = await requireAdmin("verifications.decide");
  if (!Array.isArray(checks) || !REVIEW_CHECKS.every((c) => checks.includes(c))) return { error: "checks" };
  const request = await loadPending(requestId);
  if (!request) return { error: "already_decided" };

  const now = new Date();
  const until = new Date(now.getTime() + VERIFICATION_DAYS * 86_400_000);
  const decided = await db.$transaction(async (tx) => {
    // Only one staff member can decide a request (status still pending).
    const { count } = await tx.verificationRequest.updateMany({
      where: { id: request.id, status: "pending" },
      data: { status: "approved", reviewedBy: admin.userId, reviewedAt: now },
    });
    if (count !== 1) return false;
    await tx.socialAccount.update({ where: { id: request.accountId }, data: { verificationStatus: "verified", verifiedUntil: until } });
    await audit(admin, "verification.approve", { type: "verification_request", id: request.id }, { accountId: request.accountId, handle: request.handle, platform: request.platform, followers: request.followers }, tx);
    return true;
  });
  if (!decided) return { error: "already_decided" };
  updateTag(pageCacheTag(request.account.page.username));
  await notify(request.account.page.userId, "verification_approved", { platform: PLATFORM_NAMES[request.platform], handle: request.handle, untilDate: until.toISOString() });
  return { ok: true };
}

/** Rejects a request with a preset reason. A still-valid verification (renewal) stays until it expires. */
export async function rejectVerification(requestId: string, reason: string): Promise<DecisionResult> {
  const admin = await requireAdmin("verifications.decide");
  if (!(REJECT_REASONS as readonly string[]).includes(reason)) return { error: "failed" };
  const request = await loadPending(requestId);
  if (!request) return { error: "already_decided" };

  const now = new Date();
  const stillValid = request.account.verificationStatus === "verified" && !!request.account.verifiedUntil && request.account.verifiedUntil > now;
  const decided = await db.$transaction(async (tx) => {
    const { count } = await tx.verificationRequest.updateMany({
      where: { id: request.id, status: "pending" },
      data: { status: "rejected", reason, reviewedBy: admin.userId, reviewedAt: now },
    });
    if (count !== 1) return false;
    if (!stillValid) await tx.socialAccount.update({ where: { id: request.accountId }, data: { verificationStatus: "rejected", verifiedUntil: null } });
    await audit(admin, "verification.reject", { type: "verification_request", id: request.id }, { accountId: request.accountId, handle: request.handle, reason }, tx);
    return true;
  });
  if (!decided) return { error: "already_decided" };
  updateTag(pageCacheTag(request.account.page.username));
  await notify(request.account.page.userId, "verification_rejected", { platform: PLATFORM_NAMES[request.platform], handle: request.handle, reason });
  return { ok: true };
}

/** Approves or rejects a license file (status still in review, so only one staff member decides). */
export async function decideLicense(licenseId: string, approve: boolean, reason?: string): Promise<DecisionResult> {
  const admin = await requireAdmin("verifications.decide");
  if (!approve && !(LICENSE_REJECT_REASONS as readonly string[]).includes(String(reason))) return { error: "failed" };
  const license = await db.license.findFirst({ where: { id: String(licenseId), verificationStatus: "in_review" }, include: { page: { select: { username: true, userId: true } } } });
  if (!license) return { error: "already_decided" };

  const now = new Date();
  const decided = await db.$transaction(async (tx) => {
    const { count } = await tx.license.updateMany({
      where: { id: license.id, verificationStatus: "in_review" },
      data: { verificationStatus: approve ? "verified" : "rejected", rejectReason: approve ? null : String(reason), reviewedAt: now, reviewedBy: admin.userId },
    });
    if (count !== 1) return false;
    await audit(admin, approve ? "license.approve" : "license.reject", { type: "license", id: license.id }, { name: license.name, number: license.number, username: license.page.username, ...(approve ? {} : { reason }) }, tx);
    return true;
  });
  if (!decided) return { error: "already_decided" };
  updateTag(pageCacheTag(license.page.username));
  await notify(license.page.userId, approve ? "license_verified" : "license_rejected", { license: license.name, reason: approve ? null : reason });
  return { ok: true };
}
