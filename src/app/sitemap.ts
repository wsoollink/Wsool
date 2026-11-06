import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { allPublished } from "@/lib/academy";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";

/**
 * wsool.link/sitemap.xml (Nov 2026, with the Academy): the marketing pages, every published Academy article and every
 * public creator page (published, not deleted or suspended, not a whole-page private one, not an unclaimed agency draft).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built per request (not frozen at deploy time): new articles and pages show up without a deploy.
  await connection();
  const base = siteOrigin();
  const fixed = ["", "/pricing", "/agencies", "/academy", "/contact", "/terms", "/privacy", "/refund"].map((p) => ({
    url: `${base}${p}`, changeFrequency: (p === "/academy" ? "daily" : "weekly") as "daily" | "weekly", priority: p === "" ? 1 : 0.7,
  }));
  const [articles, pages] = await Promise.all([
    allPublished().catch(() => []),
    db.page.findMany({
      where: { isPublished: true, deletedAt: null, lockWhole: false, user: { suspendedAt: null, placeholder: false } },
      select: { username: true, updatedAt: true }, take: 45000,
    }).catch(() => []),
  ]);
  // One address per slug (both languages can share one; the page picks by the visitor's language).
  const seen = new Set<string>();
  const articleUrls = articles.filter((a) => !seen.has(a.slug) && seen.add(a.slug)).map((a) => ({
    url: `${base}/academy/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.6,
  }));
  return [...fixed, ...articleUrls, ...pages.map((p) => ({ url: `${base}/${p.username}`, lastModified: p.updatedAt, priority: 0.5 }))];
}
