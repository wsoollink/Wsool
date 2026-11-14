import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GraduationCap, Rss, Search } from "lucide-react";
import { AcademyHeader } from "@/components/academy/AcademyHeader";
import { ArticleCard } from "@/components/academy/ArticleCard";
import { AppBadges } from "@/components/site/AppBadges";
import { NewsletterCard } from "@/components/site/NewsletterCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SocialLinks } from "@/components/site/SocialLinks";
import { buttonClasses } from "@/components/ui/Button";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { ACADEMY_CATEGORIES, ARTICLES_PER_PAGE, publishedArticles, type AcademyCategory } from "@/lib/academy";
import { siteOrigin } from "@/lib/site-url";
import { shareMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/academy">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Academy" });
  return {
    ...shareMeta(locale, { title: t("name"), description: t("lead"), path: "/academy" }),
    alternates: { canonical: `${siteOrigin()}/academy`, types: { "application/rss+xml": `${siteOrigin()}/academy/feed` } },
  };
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Category chips, search and the article grid (reads the query: inside Suspense). */
async function Articles({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  const t = await getTranslations("Academy");
  const sp = await searchParams;
  const cat = (ACADEMY_CATEGORIES as readonly string[]).includes(one(sp.c)) ? (one(sp.c) as AcademyCategory) : null;
  const q = one(sp.q).trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(one(sp.p), 10) || 1);
  const all = await publishedArticles(lang);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const found = all.filter((a) => (!cat || a.category === cat) && words.every((w) => `${a.title} ${a.summary}`.toLowerCase().includes(w)));
  const pages = Math.max(1, Math.ceil(found.length / ARTICLES_PER_PAGE));
  const shown = found.slice((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  const labels = (a: (typeof all)[number]) => ({ category: t(`cat.${a.category}`), minutes: t("minutes", { n: a.minutes }), date: a.publishedAt ? date.format(a.publishedAt) : "" });
  const href = (c: string | null, p = 1) => {
    const s = new URLSearchParams({ ...(c && { c }), ...(q && { q }), ...(p > 1 && { p: String(p) }) }).toString();
    return `/academy${s ? `?${s}` : ""}`;
  };
  const chip = "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-bold";
  const featured = !cat && !q && page === 1 ? shown[0] : null;
  const rest = featured ? shown.slice(1) : shown;
  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label={t("categories")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <Link href={href(null)} aria-current={!cat ? "page" : undefined} className={`${chip} ${!cat ? "border-navy bg-navy text-on-navy" : "border-line bg-card text-navy hover:border-navy/30"}`}>{t("all")}</Link>
          {ACADEMY_CATEGORIES.map((c) => (
            <Link key={c} href={href(c)} aria-current={cat === c ? "page" : undefined} className={`${chip} ${cat === c ? "border-navy bg-navy text-on-navy" : "border-line bg-card text-navy hover:border-navy/30"}`}>{t(`cat.${c}`)}</Link>
          ))}
        </nav>
        <form action="/academy" role="search" className="relative md:w-72">
          {cat && <input type="hidden" name="c" value={cat} />}
          <Search aria-hidden="true" size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" type="search" defaultValue={q} aria-label={t("search")} placeholder={t("search")} className="h-11 w-full rounded-full border border-line bg-card ps-11 pe-4 text-sm" />
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-card p-10 text-center">
          <p className="font-bold">{all.length === 0 ? t("soon") : t("noResults")}</p>
          {all.length > 0 && <Link href="/academy" className="mt-3 inline-flex min-h-11 items-center font-bold text-blue">{t("all")}</Link>}
        </div>
      ) : (
        <>
          {featured && <ArticleCard a={featured} labels={labels(featured)} big />}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => <ArticleCard key={a.id} a={a} labels={labels(a)} />)}
            </div>
          )}
          {pages > 1 && (
            <nav aria-label={t("pages")} className="flex items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={href(cat, p)} aria-current={p === page ? "page" : undefined}
                  className={`inline-flex size-11 items-center justify-center rounded-full font-numbers text-sm font-bold ${p === page ? "bg-navy text-on-navy" : "border border-line bg-card"}`}>{p}</Link>
              ))}
            </nav>
          )}
        </>
      )}
    </>
  );
}

/** Wsool Academy (owner, Nov 2026): articles for creators and agencies, newest first, by category and search. */
export default async function AcademyPage({ params, searchParams }: PageProps<"/[locale]/academy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Academy");
  return (
    <div className="flex flex-1 flex-col bg-bg-marketing">
      <AcademyHeader lang={locale} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 md:py-12">
        <section className="ac-hero relative overflow-hidden rounded-[22px] px-6 py-10 text-white md:px-12 md:py-14">
          <div className="relative flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold"><GraduationCap aria-hidden="true" size={15} /> {t("name")}</span>
            <h1 className="text-3xl font-black leading-snug md:text-5xl md:leading-tight">{t("title")}</h1>
            <p className="max-w-2xl text-base leading-8 text-white/80 md:max-w-none md:text-lg">{t("lead")}</p>
            {/* A route handler (XML), not a page: plain link. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/academy/feed" className="mt-1 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white"><Rss aria-hidden="true" size={15} /> RSS</a>
          </div>
        </section>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-card" />}>
          <Articles lang={locale} searchParams={searchParams} />
        </Suspense>
        <section className="flex flex-col items-center gap-3 rounded-card border border-line bg-card p-8 text-center shadow-card">
          <h2 className="text-xl font-black md:text-2xl">{t("ctaTitle")}</h2>
          <p className="max-w-xl text-muted">{t("ctaText")}</p>
          <Link href="/login" className={buttonClasses("primary")}>{t("ctaButton")}</Link>
        </section>
      </main>
      {/* Newsletter + "Follow us" + "Get the app", like the home page card (owner, Nov 2026). */}
      <NewsletterCard lang={locale} list="creators" source="academy" ns="Site.newsletter" placeholder="name@email.com">
        <SocialLinks className="[&_ul]:justify-center [&_ul]:flex-nowrap [&_ul]:gap-1.5 [&_li]:min-w-0 [&_li]:flex-[0_1_44px] [&_a]:size-auto [&_a]:aspect-square [&_a]:w-full" />
        <AppBadges />
      </NewsletterCard>
      <SiteFooter lang={locale} />
    </div>
  );
}
