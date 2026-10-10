"use server";

import { updateTag } from "next/cache";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import { isOwnUploadedFile, readPrivateImage, removeVerificationFiles } from "@/lib/storage";
import { compareRead, type AccountRead, type ReadComparison } from "@/lib/ai/compare";
import { aiEnabled, readAccountScreenshot, underDailyLimit } from "@/lib/ai/screenshots";
import type { Prisma } from "@/generated/prisma/client";

export type VerifyResult = { ok?: boolean; error?: "failed" };

/** True while a verification is approved and not expired (renewals keep it). */
const isValid = (a: { verificationStatus: string; verifiedUntil: Date | null }) =>
  a.verificationStatus === "verified" && !!a.verifiedUntil && a.verifiedUntil.getTime() > Date.now();

/**
 * Sends a screenshot of one of the creator's own accounts for review. A newer
 * screenshot replaces a pending one. A still-valid verification stays valid
 * while its renewal is reviewed.
 */
export async function submitVerification(accountId: string, path: string, readId?: string | null): Promise<VerifyResult> {
  const { user, page } = await requireCreator();
  const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id } });
  if (!account || typeof path !== "string" || !(await isOwnUploadedFile(user.id, "verification", path))) return { error: "failed" };

  // The AI reading of this same screenshot (if any) goes to staff with the request.
  const aiRead = readId ? await db.aiRead.findFirst({ where: { id: String(readId), userId: user.id, path, ok: true }, select: { result: true } }) : null;
  const pending = await db.verificationRequest.findMany({ where: { accountId: account.id, status: "pending" }, select: { screenshotPath: true } });
  await db.$transaction([
    db.verificationRequest.updateMany({ where: { accountId: account.id, status: "pending" }, data: { status: "cancelled" } }),
    db.verificationRequest.create({
      data: {
        accountId: account.id, screenshotPath: path, platform: account.platform, handle: account.handle, followers: account.followers,
        ...(aiRead?.result && { aiResult: aiRead.result as Prisma.InputJsonValue }),
      },
    }),
    ...(isValid(account) ? [] : [db.socialAccount.update({ where: { id: account.id }, data: { verificationStatus: "in_review", verifiedUntil: null } })]),
  ]);
  await removeVerificationFiles(pending.map((r) => r.screenshotPath)).catch(() => {});
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

export type ScreenshotCheck =
  | { skipped: true; reason: "off" | "limit" | "failed" }
  | { skipped?: false; readId: string; read: AccountRead; comparison: ReadComparison };

/**
 * Reads a just-uploaded verification screenshot with the AI and compares it
 * with the account, so the creator sees the result before sending. Never
 * blocks sending: when the AI is off, over the daily limit or fails, the
 * creator continues as before.
 */
export async function checkScreenshot(accountId: string, path: string): Promise<ScreenshotCheck> {
  const { user, page } = await requireCreator();
  if (!aiEnabled()) return { skipped: true, reason: "off" };
  const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id } });
  if (!account || typeof path !== "string" || !(await isOwnUploadedFile(user.id, "verification", path))) return { skipped: true, reason: "failed" };
  if (!(await underDailyLimit(user.id))) return { skipped: true, reason: "limit" };
  let read: AccountRead | null = null;
  try {
    const image = await readPrivateImage(path);
    read = image ? await readAccountScreenshot(image) : null;
  } catch (err) {
    console.error("[ai] account read failed", err);
  }
  const row = await db.aiRead.create({
    data: { userId: user.id, kind: "account", path, accountId: account.id, ok: !!read, ...(read && { result: read as unknown as Prisma.InputJsonValue }) },
  });
  if (!read) return { skipped: true, reason: "failed" };
  return { readId: row.id, read, comparison: compareRead(read, account) };
}

/**
 * Sets the account's follower count to what the AI read from the creator's
 * own screenshot (one tap instead of retyping). The value comes from the
 * stored reading, never from the browser.
 */
export async function applyReadFollowers(readId: string): Promise<{ ok?: boolean; followers?: number; comparison?: ReadComparison; error?: "failed" }> {
  const { user, page } = await requireCreator();
  const row = await db.aiRead.findFirst({ where: { id: String(readId), userId: user.id, kind: "account", ok: true } });
  const read = row?.result as AccountRead | null | undefined;
  if (!row?.accountId || !read || read.followers === null || read.followers < 0 || read.followers > 1e10) return { error: "failed" };
  const account = await db.socialAccount.findFirst({ where: { id: row.accountId, pageId: page.id } });
  if (!account) return { error: "failed" };
  const updated = await db.socialAccount.update({
    where: { id: account.id },
    data: { followers: read.followers, followersUpdatedAt: new Date() },
  });
  updateTag(pageCacheTag(page.username));
  return { ok: true, followers: updated.followers, comparison: compareRead(read, updated) };
}

/** Withdraws the pending request of one of the creator's own accounts. */
export async function cancelVerification(accountId: string): Promise<VerifyResult> {
  const { page } = await requireCreator();
  const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id } });
  if (!account) return { error: "failed" };
  const pending = await db.verificationRequest.findMany({ where: { accountId: account.id, status: "pending" }, select: { screenshotPath: true } });
  await db.$transaction([
    db.verificationRequest.updateMany({ where: { accountId: account.id, status: "pending" }, data: { status: "cancelled" } }),
    ...(account.verificationStatus === "in_review" ? [db.socialAccount.update({ where: { id: account.id }, data: { verificationStatus: "none" } })] : []),
  ]);
  await removeVerificationFiles(pending.map((r) => r.screenshotPath)).catch(() => {});
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Sends one of the creator's own licenses (with a file) for staff review. */
export async function submitLicense(licenseId: string): Promise<VerifyResult> {
  const { page } = await requireCreator();
  const { count } = await db.license.updateMany({
    where: { id: String(licenseId), pageId: page.id, fileUrl: { not: null }, verificationStatus: { in: ["none", "rejected"] } },
    data: { verificationStatus: "in_review", submittedAt: new Date(), rejectReason: null },
  });
  return count === 1 ? { ok: true } : { error: "failed" };
}

/** Withdraws a license review request. */
export async function cancelLicense(licenseId: string): Promise<VerifyResult> {
  const { page } = await requireCreator();
  const { count } = await db.license.updateMany({
    where: { id: String(licenseId), pageId: page.id, verificationStatus: "in_review" },
    data: { verificationStatus: "none", submittedAt: null },
  });
  return count === 1 ? { ok: true } : { error: "failed" };
}
