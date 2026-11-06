import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { AGENCY_LEGAL_TEXT } from "@/content/agency-legal";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { shareMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies/terms">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  return shareMeta(locale, { title: AGENCY_LEGAL_TEXT[locale].terms.title, description: m("agencyTermsDesc"), path: "/agencies/terms", canonical: true });
}

/** The agencies' own version (src/content/agency-legal.ts). */
export default async function AgencyLegal({ params }: PageProps<"/[locale]/agencies/terms">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <LegalPage lang={locale} kind="terms" audience="agency" />;
}
