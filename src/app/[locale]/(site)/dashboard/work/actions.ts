"use server";

import { updateTag } from "next/cache";
import type { Platform } from "@/generated/prisma/enums";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageLanguages } from "@/lib/page-language";
import { pageCacheTag } from "@/lib/public-page";
import { removeUnused, resolveFile } from "@/lib/page-files";
import { parseWorkLink, type WorkLinkPlatform } from "@/lib/work-link";
import { resolveWorkLink, workLinkCover } from "@/lib/work-link-server";
import { publicFileUrl, storeServerFile } from "@/lib/storage";
import { brandsSchema, worksSchema, type BrandInput, type WorkInput } from "@/lib/validation/work";

export type WorkResult = { ok?: boolean; error?: "failed" | "missing_file" | "bad_link" };

/** Replaces the creator's brand logos (order = list order). Every brand needs a logo. */
export async function saveBrands(items: BrandInput[]): Promise<WorkResult> {
  const { user, page } = await requireCreator();
  const parsed = brandsSchema.safeParse(items);
  if (!parsed.success) return { error: "failed" };

  const current = new Set((await db.brandLogo.findMany({ where: { pageId: page.id }, select: { logoUrl: true } })).map((b) => b.logoUrl));
  const rows = [];
  for (const [sort, item] of parsed.data.entries()) {
    const logoUrl = await resolveFile(user.id, "logo", item, current);
    if (logoUrl === undefined) return { error: "failed" };
    if (logoUrl === null) return { error: "missing_file" };
    rows.push({ pageId: page.id, name: item.name, logoUrl, sort });
  }

  await db.$transaction([db.brandLogo.deleteMany({ where: { pageId: page.id } }), db.brandLogo.createMany({ data: rows })]);
  await removeUnused(current, new Set(rows.map((r) => r.logoUrl)));
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/**
 * Replaces the creator's past works. Each is an uploaded video or a TikTok /
 * Instagram / YouTube link (its platform comes from the link); the cover is
 * optional. Texts are saved for the page's languages only.
 */
export async function saveWorks(items: WorkInput[]): Promise<WorkResult> {
  const { user, page } = await requireCreator();
  const parsed = worksSchema.safeParse(items);
  if (!parsed.success) return { error: "failed" };

  const existing = await db.portfolioItem.findMany({ where: { pageId: page.id }, select: { videoUrl: true, thumbUrl: true } });
  const videos = new Set(existing.map((w) => w.videoUrl).filter((u): u is string => !!u));
  const thumbs = new Set(existing.map((w) => w.thumbUrl).filter((u): u is string => !!u));
  const langs = pageLanguages(page.primaryLang as "ar" | "en", page.enEnabled);

  const rows = [];
  for (const [sort, item] of parsed.data.entries()) {
    const thumbUrl = await resolveFile(user.id, "thumb", item.thumb, thumbs);
    if (thumbUrl === undefined) return { error: "failed" };
    let videoUrl: string | null = null, linkUrl: string | null = null, platform = item.platform as Platform | null;
    if (item.link) {
      // Already resolved by checkWorkLink: only the canonical form is accepted here (no network).
      const link = parseWorkLink(item.link);
      if (!link) return { error: "bad_link" };
      linkUrl = link.url;
      platform = link.platform;
    } else {
      const video = await resolveFile(user.id, "video", item.video, videos);
      if (video === undefined) return { error: "failed" };
      if (video === null) return { error: "missing_file" };
      videoUrl = video;
    }
    rows.push({
      pageId: page.id,
      platform,
      videoUrl,
      linkUrl,
      thumbUrl,
      sort,
      translations: langs.map((lang) => ({ lang, brand: item[lang].brand, type: item[lang].type })),
    });
  }

  await db.$transaction([
    db.portfolioItem.deleteMany({ where: { pageId: page.id } }),
    ...rows.map(({ translations, ...row }) => db.portfolioItem.create({ data: { ...row, translations: { create: translations } } })),
  ]);
  await removeUnused(videos, new Set(rows.map((r) => r.videoUrl).filter((u): u is string => !!u)));
  await removeUnused(thumbs, new Set(rows.map((r) => r.thumbUrl).filter((u): u is string => !!u)));
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

export type LinkCheck = { link?: string; platform?: WorkLinkPlatform; cover?: { path: string; url: string } | null; error?: "bad_link" };

/**
 * Checks a pasted work link: follows TikTok share links, returns the clean
 * link and its platform, and a cover (YouTube/TikTok) stored in the creator's
 * folder like an upload. Instagram: no cover (the creator can add one).
 */
export async function checkWorkLink(input: string): Promise<LinkCheck> {
  const { user } = await requireCreator();
  const link = await resolveWorkLink(String(input ?? "").slice(0, 400));
  if (!link) return { error: "bad_link" };
  const image = await workLinkCover(link);
  const path = image ? await storeServerFile(user.id, "thumb", image.bytes, image.type) : null;
  return { link: link.url, platform: link.platform, cover: path ? { path, url: publicFileUrl(path) } : null };
}
