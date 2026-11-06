"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin";
import { ACADEMY_TAG, articleSchema, type ArticleInput } from "@/lib/academy";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createUploadTicket, isOwnUploadedFile, publicFileUrl } from "@/lib/storage";
import { ACADEMY_STARTERS } from "@/content/academy-starters";

const id = z.uuid();
type Result = { ok?: true; error?: "invalid" | "slug_taken" | "past" | "not_found" };

/** A new empty draft in that language; the browser then opens its editor (no server redirect). */
export async function createArticle(lang: "ar" | "en"): Promise<{ id: string }> {
  const admin = await requireAdmin("academy.edit");
  const a = await db.article.create({
    data: { lang: lang === "en" ? "en" : "ar", slug: `draft-${crypto.randomUUID().slice(0, 8)}`, title: "", category: "pricing", createdBy: admin.userId },
  });
  return { id: a.id };
}

/**
 * Saves an article and sets when it's public: "draft" (hidden), "now" (published now; an already published article keeps
 * its date), "schedule" (published at `at`, which must be in the future).
 */
export async function saveArticle(articleId: string, input: ArticleInput, when: "draft" | "now" | "schedule", at?: string): Promise<Result> {
  const admin = await requireAdmin("academy.edit");
  const parsed = articleSchema.safeParse(input);
  if (!id.safeParse(articleId).success || !parsed.success) return { error: "invalid" };
  const data = parsed.data;
  const current = await db.article.findUnique({ where: { id: articleId }, select: { publishedAt: true, coverUrl: true } });
  if (!current) return { error: "not_found" };
  // A cover is a fresh upload checked by academyImageUrl (a URL in our storage) or the one the article already had.
  if (data.coverUrl && data.coverUrl !== current.coverUrl && !data.coverUrl.startsWith(publicFileUrl(""))) return { error: "invalid" };
  const now = new Date();
  let publishedAt: Date | null = null;
  if (when === "now") publishedAt = current.publishedAt && current.publishedAt <= now ? current.publishedAt : now;
  if (when === "schedule") {
    const d = at ? new Date(at) : null;
    if (!d || Number.isNaN(d.getTime()) || d <= now) return { error: "past" };
    publishedAt = d;
  }
  const taken = await db.article.findFirst({ where: { lang: data.lang, slug: data.slug, id: { not: articleId } }, select: { id: true } });
  if (taken) return { error: "slug_taken" };
  await db.$transaction(async (tx) => {
    await tx.article.update({ where: { id: articleId }, data: { ...data, publishedAt } });
    const action = when === "draft" ? (current.publishedAt ? "academy.unpublish" : "academy.save") : when === "now" ? "academy.publish" : "academy.schedule";
    await audit(admin, action, { type: "article", id: articleId }, { title: data.title, slug: data.slug, lang: data.lang }, tx);
  });
  updateTag(ACADEMY_TAG);
  return { ok: true };
}

export async function deleteArticle(articleId: string): Promise<Result> {
  const admin = await requireAdmin("academy.edit");
  if (!id.safeParse(articleId).success) return { error: "invalid" };
  const a = await db.article.findUnique({ where: { id: articleId }, select: { title: true, slug: true } });
  if (!a) return { error: "not_found" };
  await db.$transaction(async (tx) => {
    await tx.article.delete({ where: { id: articleId } });
    await audit(admin, "academy.delete", { type: "article", id: articleId }, { title: a.title, slug: a.slug }, tx);
  });
  updateTag(ACADEMY_TAG);
  return { ok: true };
}

/** Adds the starter articles (src/content/academy-starters.ts) as drafts, skipping any whose address already exists. */
export async function importStarters(): Promise<{ added: number }> {
  const admin = await requireAdmin("academy.edit");
  const existing = new Set((await db.article.findMany({ select: { lang: true, slug: true } })).map((a) => `${a.lang}:${a.slug}`));
  const fresh = ACADEMY_STARTERS.filter((s) => !existing.has(`${s.lang}:${s.slug}`));
  if (fresh.length) {
    await db.$transaction(async (tx) => {
      await tx.article.createMany({ data: fresh.map((s) => ({ ...s, coverUrl: null, createdBy: admin.userId })) });
      await audit(admin, "academy.import", undefined, { count: fresh.length }, tx);
    });
  }
  return { added: fresh.length };
}

/** One-time upload URL for an article image or cover (staff member's own folder, kind academyImage). */
export async function requestAcademyUpload(_kind: string, contentType: string, size: number) {
  const admin = await requireAdmin("academy.edit");
  if (typeof contentType !== "string" || typeof size !== "number") return { error: "type" as const };
  if (!(await rateLimit(`upload:${admin.userId}`, 150, 3600))) return { error: "type" as const };
  return createUploadTicket(admin.userId, "academyImage", contentType, size);
}

/** Checks the uploaded image (path, real type and size) and returns its public link. */
export async function academyImageUrl(path: string): Promise<{ url?: string; error?: string }> {
  const admin = await requireAdmin("academy.edit");
  if (typeof path !== "string" || !(await isOwnUploadedFile(admin.userId, "academyImage", path))) return { error: "invalid" };
  return { url: publicFileUrl(path) };
}
