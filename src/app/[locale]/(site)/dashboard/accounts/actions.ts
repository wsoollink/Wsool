"use server";

import { z } from "zod";
import type { Platform } from "@/generated/prisma/enums";
import { autoFilled, linkProfileUrl, profileUrl } from "@/config/platforms";
import { disconnect } from "@/lib/connect";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageChanged } from "@/lib/public-page";
import { audienceFromRead, type AudienceFill } from "@/lib/ai/audience";
import { aiEnabled, readAudienceScreenshot, underDailyLimit } from "@/lib/ai/screenshots";
import { isOwnUploadedFile, readPrivateImage, removeVerificationFiles } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma/client";
import { accountsSchema, audienceSchema, monthlyViewsSchema, type AccountInput, type AudienceInput, type MonthlyViewsInput } from "@/lib/validation/accounts";

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
  const current = await db.socialAccount.findMany({ where: { pageId: page.id }, include: { connection: { select: { status: true } } } });
  const byId = new Map(current.map((a) => [a.id, a]));
  if (parsed.data.some((a) => a.id && !byId.has(a.id))) return { error: "failed" };
  const ids = parsed.data.map((a) => a.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) return { error: "failed" };

  // Profile links are built on the server, or (link platforms) checked against the platform's domain.
  const urls = parsed.data.map((a) => profileUrl(a.platform as Platform, a.handle) ?? linkProfileUrl(a.platform as Platform, a.link ?? ""));
  if (urls.some((u) => !u)) return { error: "failed" };

  const now = new Date();
  const resets = new Set<string>();
  const kept = new Set(ids);
  const result = await db.$transaction(async (tx) => {
    await tx.socialAccount.deleteMany({ where: { pageId: page.id, id: { notIn: [...kept] as string[] } } });
    await dropDeletedViews(tx, page.id, kept as Set<string>);
    const saved = [];
    for (const [sort, item] of parsed.data.entries()) {
      const old = item.id ? byId.get(item.id) : undefined;
      // A linked account's platform, handle, link and followers come from the platform (src/lib/connect), not the form.
      const linked = old?.connection?.status === "active";
      const platform = linked ? old.platform : (item.platform as Platform);
      const data = linked
        ? { platform, handle: old.handle, url: old.url, followers: old.followers, sort }
        : { platform, handle: item.handle, url: urls[sort]!, followers: item.followers, sort };
      if (!old) {
        saved.push(await tx.socialAccount.create({ data: { ...data, pageId: page.id, followersUpdatedAt: now } }));
        continue;
      }
      const followersChanged = old.followers !== data.followers;
      const changed = followersChanged || old.platform !== platform || old.handle !== data.handle || old.url !== data.url;
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

  pageChanged(page.username);
  return { ok: true, accounts: result.map((a) => ({ id: a.id, handle: a.handle, verificationReset: resets.has(a.id) })) };
}

/** A deleted account's monthly views leave the total (the box hides when none are left). */
async function dropDeletedViews(tx: Prisma.TransactionClient, pageId: string, kept: Set<string>) {
  const row = await tx.monthlyView.findFirst({ where: { pageId }, orderBy: { month: "desc" } });
  const byAccount = row?.byAccount as Record<string, number> | null | undefined;
  if (!row || !byAccount || Object.keys(byAccount).every((id) => kept.has(id))) return;
  const left = Object.entries(byAccount).filter(([id]) => kept.has(id));
  if (left.length === 0) {
    await tx.monthlyView.delete({ where: { id: row.id } });
    return;
  }
  const views = left.reduce((sum, [, v]) => sum + BigInt(v), BigInt(0));
  await tx.monthlyView.update({ where: { id: row.id }, data: { views, byAccount: Object.fromEntries(left) } });
}

/** First day of the current month (UTC), the key for monthly views. */
function currentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Saves monthly views per account for one month (this month or one of the two
 * before). The page keeps a single month: its total (what the public box
 * shows) and the per-account numbers. All empty = the box is hidden.
 */
export async function saveMonthlyViews(input: MonthlyViewsInput): Promise<{ ok?: boolean; error?: "failed" }> {
  const { page } = await requireCreator();
  const parsed = monthlyViewsSchema.safeParse(input);
  if (!parsed.success) return { error: "failed" };
  // Ownership check: only the creator's own accounts count.
  const [accounts, current] = await Promise.all([
    db.socialAccount.findMany({ where: { pageId: page.id }, select: { id: true, platform: true, connection: { select: { status: true } } } }),
    db.monthlyView.findFirst({ where: { pageId: page.id }, orderBy: { month: "desc" } }),
  ]);
  const own = new Set(accounts.map((a) => a.id));
  // Linked accounts keep the views their platform gave (src/lib/connect), whatever the form sent.
  const auto = new Set(accounts.filter((a) => autoFilled("views", a.platform, a.connection)).map((a) => a.id));
  const kept = (current?.byAccount ?? {}) as Record<string, number>;
  const filled = [
    ...parsed.data.byAccount.filter((r) => r.views !== null && own.has(r.accountId) && !auto.has(r.accountId)),
    ...[...auto].filter((id) => typeof kept[id] === "number").map((id) => ({ accountId: id, views: kept[id] })),
  ];
  const now = currentMonth();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - parsed.data.monthsAgo, 1));
  await db.$transaction(async (tx) => {
    await tx.monthlyView.deleteMany({ where: { pageId: page.id } });
    if (filled.length === 0) return;
    const views = filled.reduce((sum, r) => sum + BigInt(r.views!), BigInt(0));
    const byAccount = Object.fromEntries(filled.map((r) => [r.accountId, r.views!]));
    await tx.monthlyView.create({ data: { pageId: page.id, month, views, byAccount } });
  });
  pageChanged(page.username);
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
  const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id }, select: { id: true, platform: true, connection: { select: { status: true } } } });
  // A linked account's audience comes from its platform (src/lib/connect).
  if (!account || autoFilled("audience", account.platform, account.connection)) return { error: "failed" };

  const data = parsed.data;
  const empty = Object.values(data).every((list) => list.length === 0);
  if (empty) {
    await db.audienceData.deleteMany({ where: { accountId: account.id } });
  } else {
    await db.audienceData.upsert({ where: { accountId: account.id }, create: { accountId: account.id, ...data }, update: data });
  }
  pageChanged(page.username);
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
    const account = await db.socialAccount.findFirst({ where: { id: String(accountId), pageId: page.id }, select: { id: true, platform: true, connection: { select: { status: true } } } });
    if (!account || autoFilled("audience", account.platform, account.connection)) return { error: "failed" };
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

/** Unlink a platform account (the creator's own): the platform's token is revoked and deleted. */
export async function disconnectAccount(accountId: string): Promise<{ ok: boolean }> {
  const { user } = await requireCreator();
  if (!z.uuid().safeParse(accountId).success) return { ok: false };
  return { ok: await disconnect(user.id, accountId) };
}
