import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportPage } from "@/components/reports/ReportPage";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { buildDemoReport } from "@/lib/demo-report";
import { shareMeta } from "@/lib/seo";

// Fictional brand and numbers: never in search results.
export async function generateMetadata({ params }: PageProps<"/[locale]/r/demo">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  return shareMeta(locale, { title: m("reportDemoTitle"), description: m("reportDesc"), path: "/r/demo", robots: { index: false, follow: false } });
}

async function Demo({ lang }: { lang: Locale }) {
  await connection(); // dates are relative to today
  return <ReportPage data={buildDemoReport(lang)} />;
}

/** Demo ad report: wsool.link/r/demo, in the visitor's language. */
export default async function DemoReportPage({ params }: PageProps<"/[locale]/r/demo">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <Suspense fallback={null}><Demo lang={locale} /></Suspense>;
}
