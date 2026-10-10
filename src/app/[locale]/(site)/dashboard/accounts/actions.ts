"use server";

import { updateTag } from "next/cache";
import type { Platform } from "@/generated/prisma/enums";
import { profileUrl } from "@/config/platforms";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import { audienceFromRead, type AudienceFill } from "@/lib/ai/audience";
import { aiEnabled, readAudienceScreenshot, underDailyLimit } from "@/lib/ai/screenshots";
import { isOwnUploadedFile, readPrivateImage, removeVerificationFiles } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma/client";
import { accountsSchema, audienceSchema, monthlyViewsSchema, type AccountInput, type AudienceInput } from "@/lib/validation/accounts";

export type AccountsResult = { ok?: boolean; error?: "failed"; accounts?: { id: string; handle: string; verificationReset: boolean }[] };

/**
 * Replaces the creator's account list. Existing accounts are updated in place
 * (their rates and audience stay attached), new ones are created, and missing
 * ones are deleted. Changing the platform, handle or followers of a verified
 * or in-review account clears its verification: the screenshot no longer
 * proves the new numbers.
 */
export async function saveAccounts(items: AccountInput[]): Promise<AccountsResult> {
  const { page } = await requireCreator();
  const parsed = accountsSchema.safeParse(items);
  if (!parsed.success) return { error: "failed" };

  // Only ids that belong to this creator's page are accepted.
  const current = await db.socialAccount.findMany({ where: { pageId: page.id } });
  const byId = new Map(current.map((a) => [a.id, a]));
  if (parsed.data.some((a) => a.id && !byId.has(a.id))) return { error: "failed" };
  const ids = parsed.data.map((a) => a.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) return { error: "failed" };

  const now = new Date();
  const resets = new Set<string>();
  const kept = new Set(ids);
  const result = await db.$transaction(async (tx) => {
    await tx.socialAccount.deleteMany({ where: { pageId: page.id, id: { notIn: [...kept] as string[] } } });
    const saved = [];
    for (const [sort, item] of parsed.data.entries()) {
      const platform = item.platform as Platform;
      const data = { platform, handle: item.handle, url: profileUrl(platform, item.handle), followers: item.followers, sort };
      const old = item.id ? byId.get(item.id) : undefined;
      if (!old) {
        saved.push(await tx.socialAccount.create({ data: { ...data, pageId: page.id, followersUpdatedAt: now } }));
        continue;
      }
      const followersChanged = old.followers !== item.followers;
      const changed = followersChanged || old.platform !== platform || old.handle !== item.handle;
      const reset = changed && old.verificationStatus !== "none" && old.verificationStatus !== "rejected";
      if (reset) resets.add(old.id);
      // The screenshot under review no longer matches the account.
      if (changed) await tx.verificationRequest.updateMany({ where: { accountId: old.id, status: "pending" }, data: { status: "cancelled" } });
      saved.push(
        await tx.socialAccount.update({
          where: { id: old.id },
          data: {
            ...data,
            ...(followersChanged && { followersUpdatedAt: now }),
            ...(reset && { verificationStatus: "none" as const, verifiedUntil: null }),
          },
        }),
      );
    }
    return saved;
  }).catch(() => null);
  if (!result) return { error: "failed" };

  updateTag(pageCacheTag(page.username));
  return { ok: true, accounts: result.map((a) => ({ id: a.id, handle: a.handle, verificationReset: resets.has(a.id) })) };
}

/** First day of the current month (UTC), the key for monthly views. */
function currentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Sets this month's total views, or clears them (null) to hide the box. */
export async function saveMonthlyViews(views: number | null, monthsAgo = 0): Promise<{ ok?: boolean; error?: "failed" }> {
  const { page } = await requireCreator();
  const parsed = monthlyViewsSchema.safeParse(views);
  // The design lets the creator pick this month or one of the two before.
  if (!parsed.success || ![0, 1, 2].includes(monthsAgo)) return { error: "failed" };
  const now = currentMonth();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  if (parsed.data === null) {
    await db.monthlyView.deleteMany({ where: { pageId: page.id } });
  } else {
    const value = BigInt(parsed.data);
    await db.monthlyView.upsert({
      where: { pageId_month: { pageId: page.id, month } },
      create: { pageId: page.id, month, views: value },
      update: { views: value },
    });
  }
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Saves the audience breakdown of one of the creator's own accounts. */
export async function saveAudience(accountId: string, input: AudienceInput): Promise<{ ok?: boolean; error?: "failed" | "over_100" }> {
  const { page } = await requireCreator();
  const parsed = audienceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.some((i) => i.message === "over_100") ? "over_100" : "failed" };
  }
  // Ownership check: the account must be on this creator's page.
  const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id }, select: { id: true } });
  if (!account) return { error: "failed" };

  const data = parsed.data;
  const empty = Object.values(data).every((list) => list.length === 0);
  if (empty) {
    await db.audienceData.deleteMany({ where: { accountId: account.id } });
  } else {
    await db.audienceData.upsert({ where: { accountId: account.id }, create: { accountId: account.id, ...data }, update: data });
  }
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

export type AudienceReadResult = { ok: true; audience: AudienceFill } | { ok?: false; error: "off" | "limit" | "not_stats" | "failed" };

/**
 * Reads an audience stats screenshot with the AI and returns the values for
 * the form (nothing is saved: the creator reviews, then saves). The image is
 * deleted right after reading.
 */
export async function readAudienceShot(accountId: string, path: string): Promise<AudienceReadResult> {
  const { user, page } = await requireCreator();
  const owned = typeof path === "string" && (await isOwnUploadedFile(user.id, "audienceShot", path));
  try {
    if (!owned) return { error: "failed" };
    if (!aiEnabled()) return { error: "off" };
    const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id }, select: { id: true } });
    if (!account) return { error: "failed" };
    if (!(await underDailyLimit(user.id))) return { error: "limit" };
    let read = null;
    try {
      const image = await readPrivateImage(path);
      read = image ? await readAudienceScreenshot(image) : null;
    } catch (err) {
      console.error("[ai] audience read failed", err);
    }
    await db.aiRead.create({ data: { userId: user.id, kind: "audience", accountId: account.id, ok: !!read, ...(read && { result: read as unknown as Prisma.InputJsonValue }) } });
    if (!read) return { error: "failed" };
    if (!read.is_audience_stats) return { error: "not_stats" };
    return { ok: true, audience: audienceFromRead(read) };
  } finally {
    if (owned) await removeVerificationFiles([path]).catch(() => {});
  }
}
