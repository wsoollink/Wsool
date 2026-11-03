import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { revalidateTag, updateTag } from "next/cache";
import type { AgencyTemplate, Platform } from "@/generated/prisma/enums";
import { normalizeUsername, usernameFormatError, type UsernameFormatError } from "@/config/usernames";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { listingRows, type DirectoryRow } from "@/lib/directory";

/**
 * Public agency page wsool.link/<slug> (owner, Nov 2026). An agency (kind "agency", not brand accounts) picks a
 * slug from the same namespace as creator usernames, writes its profile and picks a template; the page lists the
 * creators linked to it. Linked creators are shown by default; the creator can switch it off (agency_links.show_on_page)
 * and the agency can hide anyone (agency_hidden). Each card shows only what that creator's public page shows.
 */
export const agencyCacheTag = (slug: string) => `agency:${slug}`;

/** Expires the cached agency page (server actions: updateTag; route handlers/jobs: revalidateTag). */
export function refreshAgencyPage(slug: string | null | undefined) {
  if (!slug) return;
  try {
    updateTag(agencyCacheTag(slug));
  } catch {
    revalidateTag(agencyCacheTag(slug), { expire: 0 });
  }
}

/** Expires the page of the agency a creator is linked to (after the creator changes their own switch). */
export async function refreshAgencyOfPage(pageId: string) {
  const link = await db.agencyLink.findFirst({ where: { pageId, status: "active" }, select: { agency: { select: { slug: true } } } });
  refreshAgencyPage(link?.agency.slug);
}

export type SlugError = UsernameFormatError | "taken";

/** Same rules as usernames, and free across creator pages, recent username redirects and other agencies. */
export async function slugError(raw: string, agencyId: string): Promise<SlugError | null> {
  const name = normalizeUsername(raw);
  const format = usernameFormatError(name);
  if (format) return format;
  const [reserved, page, moved, other] = await Promise.all([
    db.reservedUsername.findUnique({ where: { name }, select: { name: true } }),
    db.page.findUnique({ where: { username: name }, select: { id: true } }),
    db.usernameRedirect.findFirst({ where: { name, releasedAt: { gt: new Date() } }, select: { name: true } }),
    db.agency.findUnique({ where: { slug: name }, select: { id: true } }),
  ]);
  if (reserved) return "reserved";
  if (page || moved || (other && other.id !== agencyId)) return "taken";
  return null;
}

export type AgencyCreator = DirectoryRow & { categoryNames: string[] };

export type PublicAgency = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  city: string;
  logoUrl: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  template: AgencyTemplate;
  accent: string | null;
  /** English shown to English visitors only when the agency wrote an English name or bio. */
  hasEnglish: boolean;
  creators: AgencyCreator[];
  stats: { creators: number; followers: number; verified: number; platforms: Platform[] };
};

/** Where the visitor's language isn't written, the page falls back to Arabic (and the reverse). */
export function agencyLang(visitor: Locale, hasEnglish: boolean, hasArabic: boolean): Locale {
  if (visitor === "en") return hasEnglish ? "en" : "ar";
  return hasArabic ? "ar" : "en";
}

/** The published agency page in one language, or null (unknown slug, unpublished, stopped, or a brand account). */
export async function getPublicAgency(slug: string, lang: Locale): Promise<PublicAgency | null> {
  "use cache";
  cacheTag(agencyCacheTag(slug));
  // Creator numbers change without touching the agency: refresh every 15 minutes.
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });
  return loadAgency(slug, lang, false);
}

/** Fresh data for the agency's own preview (works while unpublished). */
export function getAgencyPreview(slug: string, lang: Locale) {
  return loadAgency(slug, lang, true);
}

async function loadAgency(slug: string, lang: Locale, preview: boolean): Promise<PublicAgency | null> {
  const a = await db.agency.findUnique({
    where: { slug },
    include: {
      links: {
        where: { status: "active", showOnPage: true, agencyHidden: false },
        orderBy: [{ sort: "asc" }, { decidedAt: "asc" }],
        select: { pageId: true },
      },
    },
  });
  if (!a || a.status !== "active" || a.kind !== "agency" || (!a.pagePublished && !preview)) return null;
  const order = a.links.map((l) => l.pageId);
  const now = new Date();
  const [rows, categories] = await Promise.all([
    order.length
      ? listingRows({ id: { in: order }, isPublished: true, deletedAt: null, user: { suspendedAt: null } }, lang, now)
      : Promise.resolve([]),
    db.category.findMany({ select: { id: true, nameAr: true, nameEn: true } }),
  ]);
  const catName = new Map(categories.map((c) => [c.id, lang === "en" ? c.nameEn : c.nameAr]));
  const byId = new Map(rows.map((r) => [r.pageId, r]));
  const creators = order.flatMap((id) => {
    const r = byId.get(id);
    return r ? [{ ...r, categoryNames: r.categories.map((c) => catName.get(c)).filter((x): x is string => !!x) }] : [];
  });
  const en = lang === "en";
  const pick = (ar: string | null, enV: string | null) => ((en ? enV || ar : ar || enV) ?? "").trim();
  return {
    id: a.id,
    slug,
    name: pick(a.name, a.nameEn) || a.name,
    tagline: pick(a.tagline, a.taglineEn),
    bio: pick(a.bio, a.bioEn),
    city: pick(a.city, a.cityEn),
    logoUrl: a.logoUrl,
    whatsapp: a.whatsapp,
    email: a.email,
    website: a.website,
    template: a.template,
    accent: a.accent,
    hasEnglish: !!(a.nameEn || a.bioEn || a.taglineEn),
    creators,
    stats: {
      creators: creators.length,
      followers: creators.reduce((s, c) => s + (c.followers ?? 0), 0),
      verified: creators.filter((c) => c.verified).length,
      platforms: [...new Set(creators.flatMap((c) => c.platforms))],
    },
  };
}
