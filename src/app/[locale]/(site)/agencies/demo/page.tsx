import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AgencyProfile } from "@/components/agency-page/AgencyProfile";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { buildDemoAgency } from "@/lib/demo-agency";

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies/demo">): Promise<Metadata> {
  const { locale } = await params;
  const a = buildDemoAgency(locale === "en" ? "en" : "ar");
  // Fictional data: never in search results.
  return { title: `${a.name} · ${locale === "en" ? "Demo" : "تجريبية"}`, robots: { index: false } };
}

/** Demo agency page (fictional agency + creators), linked from the agencies landing page. */
export default async function DemoAgencyPage({ params }: PageProps<"/[locale]/agencies/demo">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <AgencyProfile agency={buildDemoAgency(locale)} lang={locale} demo />;
}
