"use server";

import { updateTag } from "next/cache";
import type { UploadKind } from "@/config/uploads";
import type { Platform } from "@/generated/prisma/enums";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageLanguages } from "@/lib/page-language";
import { pageCacheTag } from "@/lib/public-page";
import { isOwnUploadedFile, pathFromPublicUrl, publicFileUrl, removeFiles } from "@/lib/storage";
import { brandsSchema, worksSchema, type BrandInput, type FileRef, type WorkInput } from "@/lib/validation/work";

export type WorkResult = { ok?: boolean; error?: "failed" | "missing_file" };

/**
 * Resolves a file reference to the URL to store: a fresh upload must be in the
 * creator's own folder for that kind; an unchanged file must be one the
 * creator's rows already have. Anything else is refused (undefined).
 */
async function resolveFile(userId: string, kind: UploadKind, ref: FileRef, current: Set<string>): Promise<string | null | undefined> {
  if (ref.path) return (await isOwnUploadedFile(userId, kind, ref.path)) ? publicFileUrl(ref.path) : undefined;
  if (ref.url) return current.has(ref.url) ? ref.url : undefined;
  return null;
}

/** Deletes files that were used before and are not used anymore. */
async function removeUnused(before: Iterable<string>, after: Set<string | null>) {
  await removeFiles([...before].filter((u) => !after.has(u)).map((u) => pathFromPublicUrl(u))).catch(() => {});
}

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
 * Replaces the creator's past works. Each needs a video; the cover is
 * optional. Texts are saved for the page's languages only.
 */
export async function saveWorks(items: WorkInput[]): Promise<WorkResult> {
  const { user, page } = await requireCreator();
  const parsed = worksSchema.safeParse(items);
  if (!parsed.success) return { error: "failed" };

  const existing = await db.portfolioItem.findMany({ where: { pageId: page.id }, select: { videoUrl: true, thumbUrl: true } });
  const videos = new Set(existing.map((w) => w.videoUrl));
  const thumbs = new Set(existing.map((w) => w.thumbUrl).filter((u): u is string => !!u));
  const langs = pageLanguages(page.primaryLang as "ar" | "en", page.enEnabled);

  const rows = [];
  for (const [sort, item] of parsed.data.entries()) {
    const videoUrl = await resolveFile(user.id, "video", item.video, videos);
    const thumbUrl = await resolveFile(user.id, "thumb", item.thumb, thumbs);
    if (videoUrl === undefined || thumbUrl === undefined) return { error: "failed" };
    if (videoUrl === null) return { error: "missing_file" };
    rows.push({
      pageId: page.id,
      platform: item.platform as Platform | null,
      videoUrl,
      thumbUrl,
      sort,
      translations: langs.map((lang) => ({ lang, brand: item[lang].brand, type: item[lang].type })),
    });
  }

  await db.$transaction([
    db.portfolioItem.deleteMany({ where: { pageId: page.id } }),
    ...rows.map(({ translations, ...row }) => db.portfolioItem.create({ data: { ...row, translations: { create: translations } } })),
  ]);
  await removeUnused(videos, new Set(rows.map((r) => r.videoUrl)));
  await removeUnused(thumbs, new Set(rows.map((r) => r.thumbUrl)));
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}
