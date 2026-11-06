import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Clock } from "lucide-react";
import { AcademyHeader } from "@/components/academy/AcademyHeader";
import { ArticleCard } from "@/components/academy/ArticleCard";
import { Share } from "@/components/academy/Share";
import { SiteFooter } from "@/components/site/SiteFooter";
import { buttonClasses } from "@/components/ui/Button";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { publishedArticle, publishedArticles, related } from "@/lib/academy";
import { markupHeadings, markupToWebHtml } from "@/lib/email/markup";
import { siteOrigin } from "@/lib/site-url";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, slug: "_" }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/academy/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const a = await publishedArticle(locale, slug);
  if (!a) return { robots: { index: false } };
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Academy" });
  const url = `${siteOrigin()}/academy/${a.slug}`;
  return {
    title: `${a.title} · ${t("name")}`,
    description: a.summary || undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article", url, title: a.title, description: a.summary || undefined, siteName: locale === "en" ? "Wsool" : "وصول",
      publishedTime: a.publishedAt?.toISOString(), modifiedTime: a.updatedAt.toISOString(), authors: [t("author")],
      ...(a.coverUrl && { images: [{ url: a.coverUrl }] }),
    },
    twitter: { card: a.coverUrl ? "summary_large_image" : "summary", title: a.title, description: a.summary || undefined },
  };
}

async function Article({ lang, params }: { lang: Locale; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await publishedArticle(lang, slug);
  if (!a) notFound();
  // The article's own language (may differ from the site's when only the other language has this address): its labels follow it.
  const own = a.lang;
  const t = await getTranslations({ locale: toIntlLocale(own), namespace: "Academy" });
  const all = await publishedArticles(own);
  const more = related(all, a);
  const date = new Intl.DateTimeFormat(toIntlLocale(own), { dateStyle: "long" });
  const short = new Intl.DateTimeFormat(toIntlLocale(own), { dateStyle: "medium" });
  const headings = markupHeadings(a.body);
  const url = `${siteOrigin()}/academy/${a.slug}`;
  // Structured data for search engines (an Article by Wsool Team, published by Wsool).
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.summary || undefined, inLanguage: own,
    datePublished: a.publishedAt?.toISOString(), dateModified: a.updatedAt.toISOString(), mainEntityOfPage: url,
    ...(a.coverUrl && { image: [a.coverUrl] }),
    author: { "@type": "Organization", name: t("author"), url: siteOrigin() },
    publisher: { "@type": "Organization", name: own === "en" ? "Wsool" : "وصول", logo: { "@type": "ImageObject", url: `${siteOrigin()}/icon.png` } },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article lang={own} dir={own === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <nav aria-label={t("breadcrumb")} className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href="/academy" className="inline-flex min-h-11 items-center gap-1 font-bold text-blue"><ChevronLeft aria-hidden="true" size={16} className="rtl:rotate-180" />{t("name")}</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/academy?c=${a.category}`} className="inline-flex min-h-11 items-center hover:text-navy">{t(`cat.${a.category}`)}</Link>
        </nav>
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-black leading-tight md:text-5xl">{a.title}</h1>
          {a.summary && <p className="text-lg leading-8 text-muted">{a.summary}</p>}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="font-bold text-navy">{t("author")}</span> · <time dateTime={a.publishedAt?.toISOString()}>{a.publishedAt ? date.format(a.publishedAt) : ""}</time> ·
            <span className="inline-flex items-center gap-1"><Clock aria-hidden="true" size={14} /> {t("minutes", { n: a.minutes })}</span>
          </p>
        </header>
        {a.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.coverUrl} alt="" className="aspect-[16/9] w-full rounded-[18px] object-cover" fetchPriority="high" />
        )}
        {headings.length >= 3 && (
          <nav aria-label={t("toc")} className="rounded-card border border-line bg-card p-5">
            <p className="mb-2 text-sm font-black">{t("toc")}</p>
            {/* Bullets, not numbers: headings often start with their own number ("1. …"). */}
            <ul className="flex list-disc flex-col gap-1 ps-5 text-sm marker:text-blue">
              {headings.map((h) => <li key={h.id}><a href={`#${h.id}`} className="inline-flex min-h-9 items-center text-blue hover:underline">{h.text}</a></li>)}
            </ul>
          </nav>
        )}
        <div className="ac-body" dangerouslySetInnerHTML={{ __html: markupToWebHtml(a.body) }} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <Share url={url} title={a.title} labels={{ share: t("share"), copy: t("copy"), copied: t("copied") }} />
          <Link href="/academy" className="inline-flex min-h-11 items-center text-sm font-bold text-blue">{t("allArticles")}</Link>
        </div>
        <section className="ac-hero flex flex-col items-start gap-3 rounded-[18px] p-6 text-white md:p-8">
          <h2 className="text-xl font-black md:text-2xl">{t("ctaTitle")}</h2>
          <p className="text-white/80">{t("ctaText")}</p>
          <Link href="/login" className={buttonClasses("secondary")}>{t("ctaButton")}</Link>
        </section>
      </article>
      {more.length > 0 && (
        <section className="mx-auto mt-12 w-full max-w-6xl">
          <h2 className="mb-4 text-xl font-black">{t("related")}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((m) => <ArticleCard key={m.id} a={m} labels={{ category: t(`cat.${m.category}`), minutes: t("minutes", { n: m.minutes }), date: m.publishedAt ? short.format(m.publishedAt) : "" }} />)}
          </div>
        </section>
      )}
    </>
  );
}

/** One Academy article: title, author (Wsool Team), date, reading time, cover, contents, body, share, related. */
export default async function ArticlePage({ params }: PageProps<"/[locale]/academy/[slug]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return (
    <div className="flex flex-1 flex-col bg-bg-marketing">
      <AcademyHeader lang={locale} />
      <main className="flex w-full flex-1 flex-col px-4 py-8 md:py-12">
        <Suspense fallback={<div className="mx-auto h-96 w-full max-w-3xl animate-pulse rounded-card bg-card" />}>
          <Article lang={locale} params={params} />
        </Suspense>
      </main>
      <SiteFooter lang={locale} />
    </div>
  );
}
