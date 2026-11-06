import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportPage, type ReportData } from "@/components/reports/ReportPage";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { countReportView, reportByToken, reportPreview, totals, viewsByDay } from "@/lib/ad-reports";
import { isBot } from "@/lib/analytics";
import type { PostMetrics } from "@/lib/connect/types";
import { shareMeta } from "@/lib/seo";

// Private: never in search results, and the link isn't passed on to the sites it links to. The preview (WhatsApp) names the
// brand and who made it, in the report's language.
export async function generateMetadata({ params }: PageProps<"/[locale]/r/[token]">): Promise<Metadata> {
  const { locale, token } = await params;
  const r = await reportPreview(token);
  const lang: Locale = r ? (r.lang as Locale) : isLocale(locale) ? locale : "ar";
  const m = await getTranslations({ locale: toIntlLocale(lang), namespace: "Metadata" });
  const by = !r ? null : r.agency ? (lang === "en" && r.agency.nameEn) || r.agency.name : nameIn(r.page!.translations, lang, r.page!.username);
  return {
    ...shareMeta(lang, {
      title: r ? m("reportTitle", { brand: r.brand }) : m("reportDemoTitle"),
      description: by ? `${by} · ${m("reportDesc")}` : m("reportDesc"),
      path: `/r/${token}`, robots: { index: false, follow: false },
    }),
    referrer: "no-referrer",
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, token: "_" }));
}

const nameIn = (tr: { lang: string; fullName: string | null }[], lang: string, fallback: string) =>
  tr.find((x) => x.lang === lang)?.fullName || tr.find((x) => x.fullName)?.fullName || fallback;

async function Report({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await reportByToken(token);
  if (!r) {
    const t = await getTranslations("AdReport");
    return <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-2 px-4 py-20 text-center"><h1 className="text-xl font-black">{t("goneTitle")}</h1><p className="text-muted">{t("goneText")}</p></main>;
  }
  if (!isBot((await headers()).get("user-agent") ?? "")) await countReportView(r.id);
  const lang = r.lang as Locale;
  const by: ReportData["by"] = r.agency
    ? { name: (lang === "en" && r.agency.nameEn) || r.agency.name, photo: r.agency.logoUrl, href: r.agency.slug && r.agency.pagePublished ? `/${r.agency.slug}` : null, agency: true }
    : { name: nameIn(r.page!.translations, lang, r.page!.username), photo: r.page!.photoUrl, href: `/${r.page!.username}`, agency: false };
  const lastSync = r.posts.map((p) => p.lastSyncAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;
  const data: ReportData = {
    brand: r.brand, lang, by,
    posts: r.posts.map((p) => ({
      platform: p.platform, url: p.url, title: p.title, thumb: p.thumbUrl, postedAt: p.postedAt, handle: p.account.handle,
      creator: r.agency ? nameIn(p.account.page.translations, lang, p.account.page.username) : null,
      metrics: p.metrics as PostMetrics, lastSync: p.lastSyncAt,
    })),
    totals: totals(r.posts.map((p) => p.metrics as PostMetrics)),
    chart: viewsByDay(r.posts),
    updatedAt: lastSync,
  };
  return <ReportPage data={data} />;
}

/** A shared ad report: wsool.link/r/<token> (the brand's private link). */
export default async function SharedReportPage({ params }: PageProps<"/[locale]/r/[token]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return (
    <Suspense fallback={<div className="mx-auto h-96 w-full max-w-5xl animate-pulse rounded-card bg-card" />}>
      <Report params={params} />
    </Suspense>
  );
}
