import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { AGENCY_LEGAL_TEXT } from "@/content/agency-legal";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { shareMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies/privacy">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  return shareMeta(locale, { title: AGENCY_LEGAL_TEXT[locale].privacy.title, description: m("agencyPrivacyDesc"), path: "/agencies/privacy", canonical: true });
}

/** The agencies' own version (src/content/agency-legal.ts). */
export default async function AgencyLegal({ params }: PageProps<"/[locale]/agencies/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <LegalPage lang={locale} kind="privacy" audience="agency" />;
}
