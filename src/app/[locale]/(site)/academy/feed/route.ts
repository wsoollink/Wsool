import type { NextRequest } from "next/server";
import { publishedArticles } from "@/lib/academy";
import { isLocale } from "@/i18n/config";
import { siteOrigin } from "@/lib/site-url";

const x = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** RSS 2.0 feed of the Academy: wsool.link/academy/feed (the visitor's language; ?lang=ar|en picks one). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const asked = req.nextUrl.searchParams.get("lang");
  const lang = asked && isLocale(asked) ? asked : isLocale(locale) ? locale : "ar";
  const base = siteOrigin();
  const items = (await publishedArticles(lang)).slice(0, 50);
  const title = lang === "en" ? "Wsool Academy" : "وصول أكاديمي";
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${x(title)}</title>
<link>${base}/academy</link>
<atom:link href="${base}/academy/feed?lang=${lang}" rel="self" type="application/rss+xml"/>
<description>${x(lang === "en" ? "Articles for content creators and agencies" : "مقالات لصناع المحتوى والوكالات")}</description>
<language>${lang}</language>
${items.map((a) => `<item>
<title>${x(a.title)}</title>
<link>${base}/academy/${a.slug}</link>
<guid isPermaLink="true">${base}/academy/${a.slug}</guid>
${a.publishedAt ? `<pubDate>${a.publishedAt.toUTCString()}</pubDate>` : ""}
<description>${x(a.summary)}</description>
</item>`).join("\n")}
</channel>
</rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
