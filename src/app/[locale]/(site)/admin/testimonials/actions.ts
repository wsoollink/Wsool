"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createUploadTicket, isOwnUploadedFile, pathFromPublicUrl, publicFileUrl, removeFiles } from "@/lib/storage";
import { MAX_TESTIMONIALS, TESTIMONIALS_TAG, testimonialSchema, type TestimonialInput } from "@/lib/testimonials";

export type SavedTestimonial = {
  id: string; name: string; nameEn: string | null; role: string | null; roleEn: string | null;
  quote: string; quoteEn: string | null; photoUrl: string | null; visible: boolean;
};
export type SaveResult = { ok?: boolean; error?: "invalid" | "photo" | "failed"; items?: SavedTestimonial[] };

const audienceSchema = z.enum(["creators", "agencies"]);

/**
 * Replaces one page's testimonials (owner only): existing ids are updated and reordered, new rows created, missing
 * ones deleted. A photo is a fresh upload in the owner's own folder or a photo one of these rows already had;
 * photos no longer used are deleted.
 */
export async function saveTestimonials(audienceInput: string, input: TestimonialInput[]): Promise<SaveResult> {
  const admin = await requireAdmin("owner");
  const audience = audienceSchema.safeParse(audienceInput);
  const parsed = z.array(testimonialSchema).max(MAX_TESTIMONIALS).safeParse(input);
  if (!audience.success || !parsed.success) return { error: "invalid" };
  const current = await db.testimonial.findMany({ where: { audience: audience.data }, select: { id: true, photoUrl: true } });
  const known = new Set(current.map((c) => c.id));
  if (parsed.data.some((i) => i.id && !known.has(i.id))) return { error: "invalid" };
  const oldPhotos = new Set(current.map((c) => c.photoUrl).filter((u): u is string => !!u));

  const photos: (string | null)[] = [];
  for (const item of parsed.data) {
    if (!item.photo) photos.push(null);
    else if ("url" in item.photo) {
      if (!oldPhotos.has(item.photo.url)) return { error: "photo" };
      photos.push(item.photo.url);
    } else {
      if (!(await isOwnUploadedFile(admin.userId, "testimonialPhoto", item.photo.path))) return { error: "photo" };
      photos.push(publicFileUrl(item.photo.path));
    }
  }

  try {
    const saved = await db.$transaction(async (tx) => {
      const keep = new Set(parsed.data.map((i) => i.id).filter((id): id is string => !!id));
      const removed = current.filter((c) => !keep.has(c.id)).map((c) => c.id);
      if (removed.length) await tx.testimonial.deleteMany({ where: { id: { in: removed } } });
      const out = [];
      for (const [sort, i] of parsed.data.entries()) {
        const data = {
          audience: audience.data, name: i.name, nameEn: i.nameEn, role: i.role, roleEn: i.roleEn,
          quote: i.quote, quoteEn: i.quoteEn, photoUrl: photos[sort], visible: i.visible, sort,
        };
        out.push(i.id ? await tx.testimonial.update({ where: { id: i.id }, data }) : await tx.testimonial.create({ data }));
      }
      await audit(admin, "testimonial.update", undefined, {
        audience: audience.data, count: out.length, added: parsed.data.filter((i) => !i.id).length, removed: removed.length,
      }, tx);
      return out;
    });
    const used = new Set(photos.filter(Boolean));
    await removeFiles([...oldPhotos].filter((u) => !used.has(u)).map((u) => pathFromPublicUrl(u))).catch((err) => console.error("[testimonials] photo cleanup", err));
    updateTag(TESTIMONIALS_TAG);
    return {
      ok: true,
      items: saved.map((t) => ({
        id: t.id, name: t.name, nameEn: t.nameEn, role: t.role, roleEn: t.roleEn, quote: t.quote, quoteEn: t.quoteEn,
        photoUrl: t.photoUrl, visible: t.visible,
      })),
    };
  } catch (err) {
    console.error("[testimonials] save failed", err);
    return { error: "failed" };
  }
}

/** One-time upload URL for a testimonial photo (owner's own folder). */
export async function requestTestimonialUpload(_kind: string, contentType: string, size: number) {
  const admin = await requireAdmin("owner");
  if (typeof contentType !== "string" || typeof size !== "number") return { error: "type" as const };
  if (!(await rateLimit(`upload:${admin.userId}`, 150, 3600))) return { error: "type" as const };
  return createUploadTicket(admin.userId, "testimonialPhoto", contentType, size);
}
