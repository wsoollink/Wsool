import "server-only";
import type { Platform } from "@/generated/prisma/client";
import { planLabel } from "@/config/plans";
import { db } from "@/lib/db";
import { cityKey, countryCode } from "@/lib/places";

/** Follower bands for staff insights (total across the creator's accounts). */
export const SIZE_BANDS = ["none", "nano", "micro", "mid", "macro"] as const;
export type SizeBand = (typeof SIZE_BANDS)[number];
export function sizeBand(followers: number): SizeBand {
  if (followers <= 0) return "none";
  if (followers < 10_000) return "nano";
  if (followers < 100_000) return "micro";
  if (followers < 1_000_000) return "mid";
  return "macro";
}

export type CreatorRow = {
  userId: string;
  email: string;
  createdAt: Date;
  username: string | null;
  name: string;
  specialty: string;
  city: string;
  city_: { key: string; ar?: string; en?: string } | null;
  country: string;
  countryCode: string | null;
  platforms: Platform[];
  followers: number;
  verified: number;
  size: SizeBand;
  categories: string[];
  plan: "pro" | "trial" | "free";
  status: "suspended" | "noPage" | "deleted" | "published" | "hidden";
  views30: number;
};

/**
 * One row per account with what staff group and filter by. Loads every account
 * (fine for thousands; move the grouping to SQL if it grows past that).
 */
export async function creatorRows(now = new Date()): Promise<CreatorRow[]> {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const [users, views] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, createdAt: true, suspendedAt: true,
        subscription: { select: { status: true, trialEndsAt: true } },
        page: {
          select: {
            id: true, username: true, primaryLang: true, isPublished: true, deletedAt: true,
            translations: { select: { lang: true, fullName: true, specialty: true, city: true, country: true } },
            socialAccounts: { select: { platform: true, followers: true, verificationStatus: true, verifiedUntil: true } },
            categories: { select: { categoryId: true } },
          },
        },
      },
    }),
    db.pageView.groupBy({ by: ["pageId"], where: { day: { gte: since } }, _count: { _all: true } }),
  ]);
  const viewsByPage = new Map(views.map((v) => [v.pageId, v._count._all]));

  return users.map((u) => {
    const p = u.page;
    // Primary language first; an empty field falls back to the other language.
    const trs = p ? [...p.translations].sort((a) => (a.lang === p.primaryLang ? -1 : 1)) : [];
    const pick = (f: "fullName" | "specialty" | "city" | "country") => trs.find((tr) => tr[f].trim())?.[f].trim() ?? "";
    const followers = p?.socialAccounts.reduce((s, a) => s + a.followers, 0) ?? 0;
    const city = pick("city"), country = pick("country");
    return {
      userId: u.id,
      email: u.email,
      createdAt: u.createdAt,
      username: p?.username ?? null,
      name: pick("fullName"),
      specialty: pick("specialty"),
      city,
      city_: city ? cityKey(city) : null,
      country,
      // Any language's country text may be the recognisable one.
      countryCode: trs.map((tr) => countryCode(tr.country)).find(Boolean) ?? null,
      platforms: [...new Set(p?.socialAccounts.map((a) => a.platform) ?? [])],
      followers,
      verified: p?.socialAccounts.filter((a) => a.verificationStatus === "verified" && (!a.verifiedUntil || a.verifiedUntil > now)).length ?? 0,
      size: sizeBand(followers),
      categories: p?.categories.map((c) => c.categoryId) ?? [],
      plan: planLabel(u.subscription),
      status: u.suspendedAt ? "suspended" : !p ? "noPage" : p.deletedAt ? "deleted" : p.isPublished ? "published" : "hidden",
      views30: p ? viewsByPage.get(p.id) ?? 0 : 0,
    };
  });
}

/** Insight filters, read from the URL (?cat=&country=&city=&platform=&size=). "none" = not set by the creator. */
export type CreatorFilters = { cat?: string; country?: string; city?: string; platform?: string; size?: SizeBand };
export const FILTER_KEYS = ["cat", "country", "city", "platform", "size"] as const;

export function readFilters(sp: Record<string, string | string[] | undefined>): CreatorFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 100) : undefined);
  const size = one("size");
  return {
    cat: one("cat"), country: one("country"), city: one("city"), platform: one("platform"),
    size: SIZE_BANDS.includes(size as SizeBand) ? (size as SizeBand) : undefined,
  };
}

export const hasFilters = (f: CreatorFilters) => FILTER_KEYS.some((k) => f[k]);

export function matchesFilters(r: CreatorRow, f: CreatorFilters) {
  if (f.cat && (f.cat === "none" ? r.categories.length > 0 : !r.categories.includes(f.cat))) return false;
  if (f.country && (f.country === "none" ? r.countryCode !== null : r.countryCode !== f.country)) return false;
  if (f.city && (f.city === "none" ? r.city_ !== null : r.city_?.key !== f.city)) return false;
  if (f.platform && (f.platform === "none" ? r.platforms.length > 0 : !r.platforms.includes(f.platform as Platform))) return false;
  if (f.size && r.size !== f.size) return false;
  return true;
}

/** Count per value, largest first ("none" last). */
export function countBy<T>(rows: CreatorRow[], keys: (r: CreatorRow) => (string | null)[], label?: (key: string, r: CreatorRow) => T) {
  const out = new Map<string, { key: string; count: number; sample?: T }>();
  for (const r of rows) {
    const ks = keys(r);
    for (const k of ks.length ? ks : [null]) {
      const key = k ?? "none";
      const cur = out.get(key) ?? { key, count: 0, sample: label && key !== "none" ? label(key, r) : undefined };
      cur.count++;
      out.set(key, cur);
    }
  }
  return [...out.values()].sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : b.count - a.count));
}
