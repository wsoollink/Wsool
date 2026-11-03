import "server-only";
import type { Platform, Prisma } from "@/generated/prisma/client";
import { hasPro } from "@/config/plans";
import { db } from "@/lib/db";
import { cityKey, countryCode } from "@/lib/places";
import type { Locale } from "@/i18n/config";

/**
 * Creator directory for companies (owner, Nov 2026). Only creators who switch "Show my page in the Wsool directory" on
 * are listed, and only with what their public page already shows: nothing private or hidden, no contact details.
 * Searchable by active agency / brand accounts (requireAgency); no export, a daily search limit.
 */
export const DIRECTORY_PAGE_SIZE = 24;
export const DIRECTORY_DAILY_LIMIT = 300;
export const DIRECTORY_SIZES = ["nano", "micro", "mid", "macro"] as const;
export type DirectorySize = (typeof DIRECTORY_SIZES)[number];

function sizeOf(followers: number): DirectorySize | null {
  if (followers <= 0) return null;
  if (followers < 10_000) return "nano";
  if (followers < 100_000) return "micro";
  if (followers < 1_000_000) return "mid";
  return "macro";
}

/** What a page needs before it can appear (the creator sees which are missing). */
export function directoryReady(page: { isPublished: boolean; photoUrl: string | null }, categories: number) {
  return { published: page.isPublished, photo: !!page.photoUrl, category: categories > 0 };
}

export type DirectoryRow = {
  pageId: string;
  username: string;
  photoUrl: string;
  name: string;
  specialty: string;
  city: string;
  cityKey: string | null;
  country: string;
  countryCode: string | null;
  categories: string[];
  langs: Locale[];
  platforms: Platform[];
  /** null = the creator keeps their numbers private or hidden. */
  followers: number | null;
  size: DirectorySize | null;
  verified: boolean;
  /** Whole page private: only the photo, name and specialty are listed. */
  locked: boolean;
};

/** Every listed creator, in the visitor's language where the creator wrote one. */
export async function directoryRows(lang: Locale, now = new Date()): Promise<DirectoryRow[]> {
  return listingRows({
    inDirectory: true, isPublished: true, deletedAt: null, photoUrl: { not: null },
    user: { suspendedAt: null }, categories: { some: {} },
  }, lang, now);
}

/**
 * Creator cards with only what each public page shows (no private/hidden numbers; whole-page-locked = photo, name,
 * specialty). Shared by the directory and the public agency page (src/lib/agency-page.ts).
 */
export async function listingRows(where: Prisma.PageWhereInput, lang: Locale, now = new Date()): Promise<DirectoryRow[]> {
  const pages = await db.page.findMany({
    where,
    select: {
      id: true, username: true, photoUrl: true, primaryLang: true, enEnabled: true, hiddenSections: true, privateSections: true, lockWhole: true,
      translations: { select: { lang: true, fullName: true, specialty: true, city: true, country: true } },
      socialAccounts: { orderBy: { sort: "asc" }, select: { platform: true, followers: true, verificationStatus: true, verifiedUntil: true } },
      categories: { select: { categoryId: true } },
      user: { select: { subscription: { select: { status: true, trialEndsAt: true } } } },
    },
  });
  return pages.map((p) => {
    const offered: Locale[] = p.enEnabled && p.primaryLang === "ar" ? ["ar", "en"] : [p.primaryLang as Locale];
    // The visitor's language when the creator offers it, else the primary language; an empty field falls back.
    const order = [...p.translations].sort((a) => (a.lang === (offered.includes(lang) ? lang : p.primaryLang) ? -1 : 1));
    const pick = (f: "fullName" | "specialty" | "city" | "country") => order.find((t) => t[f].trim())?.[f].trim() ?? "";
    const locked = p.lockWhole;
    const numbersPublic = !locked && !p.hiddenSections.includes("numbers") && !p.privateSections.includes("numbers");
    const total = p.socialAccounts.reduce((s, a) => s + a.followers, 0);
    const city = locked ? "" : pick("city");
    const pro = hasPro(p.user.subscription, now.getTime());
    return {
      pageId: p.id,
      username: p.username,
      photoUrl: p.photoUrl ?? "",
      name: pick("fullName") || p.username,
      specialty: pick("specialty"),
      city,
      cityKey: city ? cityKey(city)?.key ?? null : null,
      country: locked ? "" : pick("country"),
      countryCode: locked ? null : p.translations.map((t) => countryCode(t.country)).find(Boolean) ?? null,
      categories: p.categories.map((c) => c.categoryId),
      langs: offered,
      platforms: locked ? [] : [...new Set(p.socialAccounts.map((a) => a.platform))],
      followers: numbersPublic ? total : null,
      size: numbersPublic ? sizeOf(total) : null,
      // The badge is a Pro feature on the page too.
      verified: !locked && pro && p.socialAccounts.some((a) => a.verificationStatus === "verified" && (!a.verifiedUntil || a.verifiedUntil > now)),
      locked,
    };
  });
}

export type DirectoryQuery = {
  q?: string; cat?: string; country?: string; city?: string; platform?: string; size?: DirectorySize; lang?: Locale; verified?: boolean; page: number;
};

export function readDirectoryQuery(sp: Record<string, string | string[] | undefined>): DirectoryQuery {
  const one = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string).slice(0, 80) : undefined);
  const size = one("size");
  const lang = one("lang");
  return {
    q: one("q")?.trim() || undefined,
    cat: one("cat"), country: one("country"), city: one("city"), platform: one("platform"),
    size: DIRECTORY_SIZES.includes(size as DirectorySize) ? (size as DirectorySize) : undefined,
    lang: lang === "ar" || lang === "en" ? lang : undefined,
    verified: one("verified") === "1",
    page: Math.max(1, Math.min(500, Number(one("p")) || 1)),
  };
}

const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[ً-ٰٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

export function searchDirectory(rows: DirectoryRow[], q: DirectoryQuery) {
  const words = q.q ? fold(q.q).split(/\s+/).filter(Boolean) : [];
  const hits = rows.filter((r) => {
    if (q.cat && !r.categories.includes(q.cat)) return false;
    if (q.country && r.countryCode !== q.country) return false;
    if (q.city && r.cityKey !== q.city) return false;
    if (q.platform && !r.platforms.includes(q.platform as Platform)) return false;
    if (q.size && r.size !== q.size) return false;
    if (q.lang && !r.langs.includes(q.lang)) return false;
    if (q.verified && !r.verified) return false;
    if (words.length) {
      const hay = fold(`${r.name} ${r.specialty} ${r.username}`);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  // Verified first, then the biggest public audience; private numbers after.
  hits.sort((a, b) => Number(b.verified) - Number(a.verified) || (b.followers ?? -1) - (a.followers ?? -1));
  const start = (q.page - 1) * DIRECTORY_PAGE_SIZE;
  return { total: hits.length, results: hits.slice(start, start + DIRECTORY_PAGE_SIZE) };
}

const dayOf = (now: Date) => new Date(now.toISOString().slice(0, 10));

/** Counts each listed page shown in a search (one statement for the whole result page). */
export async function recordImpressions(pageIds: string[], now = new Date()) {
  if (!pageIds.length) return;
  await db.$executeRaw`
    INSERT INTO directory_stats (page_id, day, impressions)
    SELECT unnest(${pageIds}::uuid[]), ${dayOf(now)}::date, 1
    ON CONFLICT (page_id, day) DO UPDATE SET impressions = directory_stats.impressions + 1`;
}

export async function recordOpen(pageId: string, now = new Date()) {
  await db.$executeRaw`
    INSERT INTO directory_stats (page_id, day, opens) VALUES (${pageId}::uuid, ${dayOf(now)}::date, 1)
    ON CONFLICT (page_id, day) DO UPDATE SET opens = directory_stats.opens + 1`;
}

/** The creator's own numbers for the last 30 days. */
export async function directoryStats(pageId: string, now = new Date()) {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const agg = await db.directoryStat.aggregate({ where: { pageId, day: { gte: dayOf(since) } }, _sum: { impressions: true, opens: true } });
  return { impressions: agg._sum.impressions ?? 0, opens: agg._sum.opens ?? 0 };
}
