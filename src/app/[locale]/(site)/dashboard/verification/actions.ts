"use server";

import { updateTag } from "next/cache";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import { isOwnUploadedFile, removeVerificationFiles } from "@/lib/storage";

export type VerifyResult = { ok?: boolean; error?: "failed" };

/** True while a verification is approved and not expired (renewals keep it). */
const isValid = (a: { verificationStatus: string; verifiedUntil: Date | null }) =>
  a.verificationStatus === "verified" && !!a.verifiedUntil && a.verifiedUntil.getTime() > Date.now();

/**
 * Sends a screenshot of one of the creator's own accounts for review. A newer
 * screenshot replaces a pending one. A still-valid verification stays valid
 * while its renewal is reviewed.
 */
export async function submitVerification(accountId: string, path: string): Promise<VerifyResult> {
  const { user, page } = await requireCreator();
  const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id } });
  if (!account || typeof path !== "string" || !(await isOwnUploadedFile(user.id, "verification", path))) return { error: "failed" };

  const pending = await db.verificationRequest.findMany({ where: { accountId: account.id, status: "pending" }, select: { screenshotPath: true } });
  await db.$transaction([
    db.verificationRequest.updateMany({ where: { accountId: account.id, status: "pending" }, data: { status: "cancelled" } }),
    db.verificationRequest.create({
      data: { accountId: account.id, screenshotPath: path, platform: account.platform, handle: account.handle, followers: account.followers },
    }),
    ...(isValid(account) ? [] : [db.socialAccount.update({ where: { id: account.id }, data: { verificationStatus: "in_review", verifiedUntil: null } })]),
  ]);
  await removeVerificationFiles(pending.map((r) => r.screenshotPath)).catch(() => {});
  updateTag(pageCacheTag(page.username));
  return { ok: true };
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
