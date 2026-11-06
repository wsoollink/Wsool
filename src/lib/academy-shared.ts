import { z } from "zod";

/** Academy rules shared by the browser (editor) and the server (src/lib/academy.ts). */
export const ACADEMY_CATEGORIES = ["pricing", "brands", "growth", "content", "platforms", "tools"] as const;
export type AcademyCategory = (typeof ACADEMY_CATEGORIES)[number];
export const ACADEMY_TAG = "academy";
export const ARTICLES_PER_PAGE = 12;

/** Lowercase latin words joined by "-" (the address wsool.link/academy/<slug>). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const articleSchema = z.object({
  lang: z.enum(["ar", "en"]),
  slug: z.string().trim().toLowerCase().min(3).max(80).regex(SLUG_PATTERN),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().max(300),
  body: z.string().trim().max(50000),
  category: z.enum(ACADEMY_CATEGORIES),
  coverUrl: z.string().trim().max(500).nullable(),
});
export type ArticleInput = z.infer<typeof articleSchema>;

