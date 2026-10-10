"use server";

import { updateTag } from "next/cache";
import { requireCreator } from "@/lib/creator";
import { isOwnUploadedFile, pathFromPublicUrl, publicFileUrl, removeFiles } from "@/lib/storage";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import { pageLanguages } from "@/lib/page-language";
import { MAX_PAGE_CATEGORIES } from "@/config/categories";
import { z } from "zod";
import { licensesSchema, profileSchema, tagsSchema, TRANSLATION_FIELDS } from "@/lib/validation/profile";

export type SaveState = { ok?: boolean; errors?: Record<string, string>; error?: "failed" | "needs_name" };

/** Saves languages and the texts for each language of the signed-in creator's page. */
export async function saveProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const { page } = await requireCreator();
  const read = (lang: "ar" | "en") =>
    Object.fromEntries(TRANSLATION_FIELDS.map((f) => [f, String(formData.get(`${lang}.${f}`) ?? "")]));

  const parsed = profileSchema.safeParse({
    primaryLang: formData.get("primaryLang"),
    enEnabled: formData.get("enEnabled") === "on",
    ar: read("ar"),
    en: read("en"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] = issue.message === "required" ? "required" : "invalid";
    return { errors };
  }

  const value = parsed.data;
  const langs = pageLanguages(value.primaryLang, value.enEnabled);
  try {
    // Every write is scoped to the page found from the verified session.
    await db.$transaction([
      db.page.update({ where: { id: page.id }, data: { primaryLang: value.primaryLang, enEnabled: value.enEnabled } }),
      ...langs.map((lang) =>
        db.pageTranslation.upsert({
          where: { pageId_lang: { pageId: page.id, lang } },
          create: { pageId: page.id, lang, ...value[lang] },
          update: value[lang],
        }),
      ),
    ]);
  } catch {
    return { error: "failed" };
  }
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Publishes or hides the page. Publishing needs a name in the primary language. */
export async function setPublished(publish: boolean): Promise<SaveState> {
  const { page } = await requireCreator();
  if (publish) {
    const tr = await db.pageTranslation.findUnique({
      where: { pageId_lang: { pageId: page.id, lang: page.primaryLang } },
      select: { fullName: true },
    });
    if (!tr?.fullName) return { error: "needs_name" };
  }
  await db.page.update({ where: { id: page.id }, data: { isPublished: publish } });
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

/** Sets (path) or removes (null) the hero photo; deletes the previous file. */
export async function savePhoto(path: string | null): Promise<SaveState & { url?: string | null }> {
  const { user, page } = await requireCreator();
  if (path !== null && (typeof path !== "string" || !(await isOwnUploadedFile(user.id, "photo", path)))) {
    return { error: "failed" };
  }
  const url = path ? publicFileUrl(path) : null;
  await db.page.update({ where: { id: page.id }, data: { photoUrl: url } });
  await removeFiles([pathFromPublicUrl(page.photoUrl)]).catch(() => {});
  updateTag(pageCacheTag(page.username));
  return { ok: true, url };
}

/** Replaces the creator's tags for one language (order = list order). */
export async function saveTags(lang: "ar" | "en", labels: string[]): Promise<SaveState> {
  const { page } = await requireCreator();
  const parsed = tagsSchema.safeParse({ lang, labels });
  if (!parsed.success) return { error: "failed" };
  const unique = [...new Set(parsed.data.labels)];
  await db.$transaction([
    db.tag.deleteMany({ where: { pageId: page.id, lang } }),
    db.tag.createMany({ data: unique.map((label, sort) => ({ pageId: page.id, lang, label, sort })) }),
  ]);
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

const categoryIds = z.array(z.uuid()).max(MAX_PAGE_CATEGORIES);

/** Replaces the creator's categories (ids must exist in the owner's list). */
export async function saveCategories(ids: string[]): Promise<SaveState> {
  const { page } = await requireCreator();
  const parsed = categoryIds.safeParse([...new Set(ids)]);
  if (!parsed.success) return { error: "failed" };
  const found = await db.category.count({ where: { id: { in: parsed.data } } });
  if (found !== parsed.data.length) return { error: "failed" };
  await db.$transaction([
    db.pageCategory.deleteMany({ where: { pageId: page.id } }),
    db.pageCategory.createMany({ data: parsed.data.map((categoryId) => ({ pageId: page.id, categoryId })) }),
  ]);
  return { ok: true };
}

export type LicenseInput = { name: string; nameEn: string; number: string; filePath: string | null; fileUrl: string | null };

/**
 * Replaces the creator's licenses. A file is either a fresh upload in the
 * creator's own folder or a file one of their current licenses already has;
 * any other URL is refused. Files no longer used are deleted.
 */
export async function saveLicenses(items: LicenseInput[]): Promise<SaveState> {
  const { user, page } = await requireCreator();
  const parsed = licensesSchema.safeParse(items);
  if (!parsed.success) return { error: "failed" };

  const current = await db.license.findMany({
    where: { pageId: page.id },
    select: { name: true, number: true, fileUrl: true, verificationStatus: true, rejectReason: true, submittedAt: true, reviewedAt: true, reviewedBy: true },
  });
  const currentUrls = new Set(current.map((l) => l.fileUrl).filter(Boolean));

  const rows = [];
  for (const [sort, item] of parsed.data.entries()) {
    let fileUrl: string | null = null;
    if (item.filePath) {
      if (!(await isOwnUploadedFile(user.id, "license", item.filePath))) return { error: "failed" };
      fileUrl = publicFileUrl(item.filePath);
    } else if (item.fileUrl) {
      if (!currentUrls.has(item.fileUrl)) return { error: "failed" };
      fileUrl = item.fileUrl;
    }
    // An unchanged license (same name, number and file) keeps its verification.
    const same = current.find((c) => c.name === item.name && c.number === item.number && c.fileUrl === fileUrl);
    const review = same
      ? { verificationStatus: same.verificationStatus, rejectReason: same.rejectReason, submittedAt: same.submittedAt, reviewedAt: same.reviewedAt, reviewedBy: same.reviewedBy }
      : {};
    rows.push({ pageId: page.id, name: item.name, nameEn: item.nameEn || null, number: item.number, fileUrl, sort, ...review });
  }

  await db.$transaction([db.license.deleteMany({ where: { pageId: page.id } }), db.license.createMany({ data: rows })]);
  const kept = new Set(rows.map((r) => r.fileUrl));
  await removeFiles([...currentUrls].filter((u) => !kept.has(u)).map((u) => pathFromPublicUrl(u))).catch(() => {});
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}
