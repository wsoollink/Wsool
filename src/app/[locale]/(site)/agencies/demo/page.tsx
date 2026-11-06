import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyProfile } from "@/components/agency-page/AgencyProfile";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { buildDemoAgency } from "@/lib/demo-agency";
import { shareMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies/demo">): Promise<Metadata> {
  const { locale } = await params;
  const a = buildDemoAgency(locale === "en" ? "en" : "ar");
  const lang = locale === "en" ? "en" : "ar";
  const m = await getTranslations({ locale: toIntlLocale(lang), namespace: "Metadata" });
  // Fictional data: never in search results.
  return shareMeta(lang, { title: `${a.name} · ${lang === "en" ? "Demo" : "تجريبية"}`, description: m("agencyDemoDesc"), path: "/agencies/demo", robots: { index: false } });
}

/** Demo agency page (fictional agency + creators), linked from the agencies landing page. */
export default async function DemoAgencyPage({ params }: PageProps<"/[locale]/agencies/demo">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <AgencyProfile agency={buildDemoAgency(locale)} lang={locale} demo />;
}
