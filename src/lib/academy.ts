import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";

/**
 * Wsool Academy (owner, Nov 2026): articles for creators and agencies at wsool.link/academy, written by staff in the
 * newsletter's text format (src/lib/email/markup.ts, rendered with markupToWebHtml). Each language has its own
 * articles; the author shown is always "Wsool Team". Drafts have no publishedAt; a future publishedAt = scheduled.
 */
export { ACADEMY_CATEGORIES, ACADEMY_TAG, ARTICLES_PER_PAGE, SLUG_PATTERN, articleSchema, type AcademyCategory, type ArticleInput } from "@/lib/academy-shared";
import { bodyToText } from "@/lib/rich-text";
import { ACADEMY_TAG, SLUG_PATTERN, type AcademyCategory } from "@/lib/academy-shared";

/** Minutes to read (about 200 words a minute, at least 1). */
export function readingMinutes(body: string) {
  const words = bodyToText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const LIST_SELECT = { id: true, slug: true, title: true, summary: true, coverUrl: true, category: true, publishedAt: true, body: true } as const;

/** Published articles of one language, newest first (cached; staff saves refresh it with updateTag(ACADEMY_TAG)). */
export async function publishedArticles(lang: Locale) {
  "use cache";
  cacheTag(ACADEMY_TAG);
  // Scheduled articles appear within the hour after their time (the cache's life).
  cacheLife("hours");
  const rows = await db.article.findMany({
    where: { lang, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    select: LIST_SELECT,
    take: 500,
  });
  return rows.map(({ body, ...a }) => ({ ...a, category: a.category as AcademyCategory, minutes: readingMinutes(body) }));
}
export type ArticleCard = Awaited<ReturnType<typeof publishedArticles>>[number];

/**
 * One published article by its address (null when missing, a draft or still scheduled). Addresses carry no language, so
 * the visitor's language wins when both have this slug, else the other one (search engines crawl without a language).
 */
export async function publishedArticle(lang: Locale, slug: string) {
  "use cache";
  cacheTag(ACADEMY_TAG);
  cacheLife("hours");
  if (!SLUG_PATTERN.test(slug)) return null;
  const rows = await db.article.findMany({ where: { slug, publishedAt: { lte: new Date() } } });
  const a = rows.find((r) => r.lang === lang) ?? rows[0];
  if (!a) return null;
  return { ...a, lang: a.lang as Locale, category: a.category as AcademyCategory, minutes: readingMinutes(a.body) };
}

/** Every published article (sitemap / feed). */
export async function allPublished() {
  "use cache";
  cacheTag(ACADEMY_TAG);
  cacheLife("hours");
  return db.article.findMany({ where: { publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" }, select: { slug: true, lang: true, title: true, summary: true, publishedAt: true, updatedAt: true }, take: 2000 });
}

/** Up to `n` other articles, same category first. */
export function related(all: ArticleCard[], current: { id: string; category: string }, n = 3) {
  const others = all.filter((a) => a.id !== current.id);
  return [...others.filter((a) => a.category === current.category), ...others.filter((a) => a.category !== current.category)].slice(0, n);
}
