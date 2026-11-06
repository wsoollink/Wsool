import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { parseReportPost, type ReportPlatform } from "@/lib/ad-report-links";
import { canConnect, linkAccess } from "@/lib/connect";
import type { PostMetrics } from "@/lib/connect/types";
import { db } from "@/lib/db";
import { fetchImage } from "@/lib/fetch-capped";
import { publicFileUrl, storeServerFile } from "@/lib/storage";
import { openToken, sealToken } from "@/lib/token-box";

/**
 * Ad reports (owner, Nov 2026): after a campaign, the creator (or their agency) lists the posts; their numbers are read from
 * the creator's linked account (never typed), updated daily for 30 days and weekly until 90, then kept. The brand gets a
 * private link wsool.link/r/<token> (revocable, views counted). Pro only (the agency plan covers its creators).
 */
export const MAX_REPORT_POSTS = 20;
export const MAX_REPORTS = 100;
/** Updates: daily while the post is under DAILY_DAYS old, weekly until FINAL_DAYS, then the numbers stay. */
const DAILY_DAYS = 30, FINAL_DAYS = 90;
const DAY = 86_400_000;

export type PostError = "invalid" | "platform" | "account" | "unlinked" | "not_found" | "revoked" | "failed" | "pro" | "duplicate";

/** A new share token: the link carries it, the database keeps its hash (lookup) and a sealed copy (copy the link again). */
export function newReportToken() {
  const token = randomBytes(18).toString("base64url");
  return { token, hash: hashReportToken(token), sealed: sealToken(token) };
}
export const hashReportToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const reportToken = (sealed: string) => openToken(sealed);

/** Saudi calendar day (UTC+3), as a Date at UTC midnight for the date column. */
export const saudiDay = (d = new Date()) => new Date(`${new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10)}T00:00:00Z`);

type Owner = { pageId: string; userId: string } | { agencyId: string };

/**
 * May this owner's report read this account? A creator: their own accounts. An agency: accounts of creators linked to it
 * with the "content" permission. The page's owner must be Pro (agency-linked creators are covered by the agency's plan).
 */
async function accountFor(owner: Owner, accountId: string) {
  const a = await db.socialAccount.findFirst({
    where: {
      id: accountId,
      page: "pageId" in owner
        ? { id: owner.pageId, deletedAt: null }
        : { deletedAt: null, agencyLinks: { some: { agencyId: owner.agencyId, status: "active", canContent: true } } },
    },
    select: { id: true, platform: true, page: { select: { userId: true } } },
  });
  return a;
}

/** Copies a platform thumbnail (their links expire) into the creator's storage; YouTube's stay as they are. */
async function keepThumb(userId: string, platform: ReportPlatform, url: string | null) {
  if (!url || platform === "youtube" || url.startsWith(publicFileUrl(""))) return url;
  const img = await fetchImage(url, 4 * 1024 * 1024);
  if (!img || !["image/jpeg", "image/png", "image/webp"].includes(img.type)) return null;
  const path = await storeServerFile(userId, "reportThumb", img.bytes, img.type);
  return path ? publicFileUrl(path) : null;
}

/** Reads one post now through its account's link: updates the row and today's snapshot. Returns the error, if any. */
export async function readPost(postId: string): Promise<PostError | null> {
  const p = await db.adReportPost.findUnique({
    where: { id: postId },
    select: {
      id: true, key: true, externalId: true, platform: true, thumbUrl: true, accountId: true,
      report: { select: { pageId: true, agencyId: true, revokedAt: true } },
      account: { select: { page: { select: { id: true, userId: true, deletedAt: true, agencyLinks: { where: { status: "active", canContent: true }, select: { agencyId: true } } } } } },
    },
  });
  if (!p) return "invalid";
  const now = new Date();
  const fail = async (error: PostError) => {
    await db.adReportPost.update({ where: { id: p.id }, data: { syncError: error, lastSyncAt: now } });
    return error;
  };
  const page = p.account.page;
  // An agency report reads a creator's account only while that creator keeps the agency linked with "content".
  if (page.deletedAt || (p.report.agencyId && !page.agencyLinks.some((l) => l.agencyId === p.report.agencyId))) return fail("unlinked");
  if (!(await canConnect(page.userId))) return fail("pro");
  const link = await linkAccess(p.accountId);
  if ("error" in link) return fail(link.error);
  const stats = await link.provider.postStats!(link.access, { key: p.key, externalId: p.externalId }, { externalId: link.externalId }).catch((err) => {
    console.warn("[ad-reports]", p.platform, (err as Error).message);
    return undefined;
  });
  if (stats === undefined) return fail("failed");
  if (stats === null) return fail("not_found");
  const thumbUrl = p.thumbUrl ?? (await keepThumb(page.userId, p.platform as ReportPlatform, stats.thumbUrl).catch(() => null));
  const metrics = stats.metrics as Prisma.InputJsonValue;
  const day = saudiDay(now);
  await db.$transaction([
    db.adReportPost.update({
      where: { id: p.id },
      data: { externalId: stats.externalId, title: stats.title?.slice(0, 300) ?? null, thumbUrl, postedAt: stats.postedAt, metrics, lastSyncAt: now, syncError: null },
    }),
    db.adReportSnapshot.upsert({ where: { postId_day: { postId: p.id, day } }, create: { postId: p.id, day, metrics }, update: { metrics } }),
  ]);
  return null;
}

/**
 * Adds posts to a report (checked: a supported link, an account this owner may read, of the same platform, linked), reading
 * each one right away so a wrong link is refused with its reason instead of sitting empty.
 */
export async function addPosts(owner: Owner, reportId: string, items: { url: string; accountId: string }[]): Promise<{ added: number; errors: { url: string; error: PostError }[] }> {
  const existing = await db.adReportPost.findMany({ where: { reportId }, select: { key: true, platform: true, sort: true } });
  const errors: { url: string; error: PostError }[] = [];
  let added = 0, sort = existing.reduce((m, p) => Math.max(m, p.sort + 1), 0);
  for (const item of items.slice(0, Math.max(0, MAX_REPORT_POSTS - existing.length))) {
    const parsed = parseReportPost(item.url);
    if (!parsed) { errors.push({ url: item.url, error: "invalid" }); continue; }
    if (existing.some((e) => e.key === parsed.key && e.platform === parsed.platform)) { errors.push({ url: item.url, error: "duplicate" }); continue; }
    const account = await accountFor(owner, item.accountId);
    if (!account) { errors.push({ url: item.url, error: "account" }); continue; }
    if (account.platform !== parsed.platform) { errors.push({ url: item.url, error: "platform" }); continue; }
    const row = await db.adReportPost.create({ data: { reportId, accountId: account.id, platform: parsed.platform, url: parsed.url, key: parsed.key, sort: sort++ } });
    const error = await readPost(row.id);
    // Only posts that could be read stay (a link that isn't this account's post, or an account that isn't linked, is refused).
    if (error) {
      await db.adReportPost.delete({ where: { id: row.id } });
      errors.push({ url: item.url, error });
      sort--;
      continue;
    }
    existing.push({ key: parsed.key, platform: parsed.platform, sort: sort - 1 });
    added++;
  }
  return { added, errors };
}

/**
 * Hourly job: posts due for an update (daily under 30 days old, weekly until 90), of live reports. A batch per run; failures
 * keep the last numbers (shown with their date).
 */
export async function syncAdReports(limit = 60, now = new Date()) {
  const posts = await db.adReportPost.findMany({
    where: {
      report: { revokedAt: null },
      OR: [{ postedAt: null }, { postedAt: { gt: new Date(now.getTime() - FINAL_DAYS * DAY) } }],
      AND: [{
        OR: [
          { lastSyncAt: null },
          { postedAt: { gt: new Date(now.getTime() - DAILY_DAYS * DAY) }, lastSyncAt: { lt: new Date(now.getTime() - 20 * 3_600_000) } },
          { lastSyncAt: { lt: new Date(now.getTime() - 7 * DAY) } },
        ],
      }],
    },
    orderBy: { lastSyncAt: { sort: "asc", nulls: "first" } },
    take: limit,
    select: { id: true },
  });
  let ok = 0, failed = 0;
  for (const p of posts) {
    if (await readPost(p.id).catch(() => "failed")) failed++;
    else ok++;
  }
  return { reportPostsSynced: ok, reportPostsFailed: failed };
}

/** Sums of each metric over posts (only metrics at least one post has). */
export function totals(list: PostMetrics[]): PostMetrics {
  const out: PostMetrics = {};
  for (const m of list) for (const [k, v] of Object.entries(m)) if (typeof v === "number" && k !== "avgViewSeconds") out[k as keyof PostMetrics] = (out[k as keyof PostMetrics] ?? 0) + v;
  return out;
}

/**
 * Views per day for the report's chart: each post's last known views carried forward day by day, summed. From the first
 * snapshot to today (at most 90 days).
 */
export function viewsByDay(posts: { snapshots: { day: Date; metrics: unknown }[] }[], now = new Date()) {
  const days = new Map<string, number>();
  const first = posts.flatMap((p) => p.snapshots.map((s) => s.day.getTime())).reduce((m, t) => Math.min(m, t), Infinity);
  if (!Number.isFinite(first)) return [];
  const end = saudiDay(now).getTime();
  const start = Math.max(first, end - (FINAL_DAYS - 1) * DAY);
  for (let t = start; t <= end; t += DAY) days.set(new Date(t).toISOString().slice(0, 10), 0);
  for (const p of posts) {
    const byDay = new Map(p.snapshots.map((s) => [s.day.toISOString().slice(0, 10), Number((s.metrics as PostMetrics)?.views ?? 0)]));
    let last = 0;
    for (const d of days.keys()) {
      if (byDay.has(d)) last = byDay.get(d)!;
      days.set(d, days.get(d)! + last);
    }
  }
  return [...days].map(([day, views]) => ({ day, views }));
}

export type ReportOwner = Owner;
const ownerWhere = (owner: Owner) => ("pageId" in owner ? { pageId: owner.pageId } : { agencyId: owner.agencyId });

/** A new report with its first posts. Refused past MAX_REPORTS; a report whose posts all failed is removed again. */
export async function createReport(owner: Owner, createdBy: string, input: { brand: string; lang: "ar" | "en"; items: { url: string; accountId: string }[] }) {
  if ((await db.adReport.count({ where: ownerWhere(owner) })) >= MAX_REPORTS) return { error: "limit" as const };
  const t = newReportToken();
  const report = await db.adReport.create({
    data: { ...ownerWhere(owner), brand: input.brand, lang: input.lang, tokenHash: t.hash, tokenSealed: t.sealed, createdBy },
  });
  const res = await addPosts(owner, report.id, input.items);
  if (!res.added) {
    await db.adReport.delete({ where: { id: report.id } });
    return { error: "no_posts" as const, errors: res.errors };
  }
  return { id: report.id, errors: res.errors };
}

/** The owner's reports, newest first, with their posts' latest numbers and the share link token. */
export async function listReports(owner: Owner) {
  const rows = await db.adReport.findMany({
    where: ownerWhere(owner),
    orderBy: { createdAt: "desc" },
    include: { posts: { orderBy: { sort: "asc" }, include: { account: { select: { handle: true, page: { select: { username: true } } } } } } },
  });
  return rows.map((r) => ({
    id: r.id, brand: r.brand, lang: r.lang, createdAt: r.createdAt, views: r.views, lastViewedAt: r.lastViewedAt, revoked: !!r.revokedAt,
    token: r.revokedAt ? null : reportToken(r.tokenSealed),
    totals: totals(r.posts.map((p) => p.metrics as PostMetrics)),
    posts: r.posts.map((p) => ({
      id: p.id, platform: p.platform, url: p.url, title: p.title, thumbUrl: p.thumbUrl, postedAt: p.postedAt, metrics: p.metrics as PostMetrics,
      lastSyncAt: p.lastSyncAt, syncError: p.syncError, handle: p.account.handle, username: p.account.page.username,
    })),
  }));
}
export type ReportRow = Awaited<ReturnType<typeof listReports>>[number];

/** Owner checks for the actions below: the report (or post) must belong to this owner. */
export const ownedReport = (owner: Owner, id: string) => db.adReport.findFirst({ where: { id, ...ownerWhere(owner) }, select: { id: true, brand: true } });
export const ownedPost = (owner: Owner, id: string) => db.adReportPost.findFirst({ where: { id, report: ownerWhere(owner) }, select: { id: true, reportId: true } });

/** A new link (the old one stops working at once). */
export async function renewReportLink(reportId: string) {
  const t = newReportToken();
  await db.adReport.update({ where: { id: reportId }, data: { tokenHash: t.hash, tokenSealed: t.sealed, revokedAt: null, views: 0, lastViewedAt: null } });
  return t.token;
}

/** The shared report behind a link (null when the token is unknown or the link was stopped). */
export async function reportByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const r = await db.adReport.findUnique({
    where: { tokenHash: hashReportToken(token) },
    include: {
      page: { select: { username: true, photoUrl: true, primaryLang: true, translations: { select: { lang: true, fullName: true } } } },
      agency: { select: { name: true, nameEn: true, logoUrl: true, slug: true, pagePublished: true } },
      posts: {
        orderBy: { sort: "asc" },
        include: {
          snapshots: { orderBy: { day: "asc" } },
          account: { select: { handle: true, page: { select: { username: true, photoUrl: true, translations: { select: { lang: true, fullName: true } } } } } },
        },
      },
    },
  });
  return r && !r.revokedAt ? r : null;
}

/** What a link preview of a shared report shows (brand, who made it, its language): one small query, no posts. */
export async function reportPreview(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const r = await db.adReport.findUnique({
    where: { tokenHash: hashReportToken(token) },
    select: {
      brand: true, lang: true, revokedAt: true,
      page: { select: { username: true, translations: { select: { lang: true, fullName: true } } } },
      agency: { select: { name: true, nameEn: true } },
    },
  });
  return r && !r.revokedAt ? r : null;
}

/** One opening of the shared link (not bots). */
export const countReportView = (id: string) => db.adReport.update({ where: { id }, data: { views: { increment: 1 }, lastViewedAt: new Date() } }).catch(() => {});
