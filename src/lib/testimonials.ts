import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";

/**
 * Testimonials (owner, Nov 2026): what creators (home page) and agencies (/agencies) say about Wsool, shown as a
 * moving strip under the FAQ. Real quotes only, added by the owner in admin/testimonials.
 */
export const TESTIMONIALS_TAG = "testimonials";
export const MAX_TESTIMONIALS = 30;
export type TestimonialAudience = "creators" | "agencies";

export type PublicTestimonial = { id: string; name: string; role: string | null; quote: string; photoUrl: string | null };

/** The visible testimonials for one page, in the visitor's language (the English site shows only those with English text). */
export async function getTestimonials(audience: TestimonialAudience, lang: Locale): Promise<PublicTestimonial[]> {
  "use cache";
  cacheTag(TESTIMONIALS_TAG);
  cacheLife("hours");
  const rows = await db.testimonial.findMany({
    where: { audience, visible: true, ...(lang === "en" ? { quoteEn: { not: null } } : {}) },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: lang === "en" ? r.nameEn || r.name : r.name,
    role: lang === "en" ? r.roleEn || null : r.role || null,
    quote: lang === "en" ? r.quoteEn ?? "" : r.quote,
    photoUrl: r.photoUrl,
  })).filter((t) => t.quote);
}

const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) => text(max).transform((v) => v || null);

/** One row of the admin editor: `photo` = a fresh upload `{path}` or a kept link `{url}`. */
export const testimonialSchema = z.object({
  id: z.uuid().nullable(),
  name: text(80).min(1),
  nameEn: optional(80),
  role: optional(80),
  roleEn: optional(80),
  quote: text(400).min(1),
  quoteEn: optional(400),
  photo: z.union([z.object({ path: z.string().max(300) }), z.object({ url: z.string().max(500) }), z.null()]),
  visible: z.boolean(),
});
export type TestimonialInput = z.input<typeof testimonialSchema>;
