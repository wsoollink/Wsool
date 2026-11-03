import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { AGENCY_LEGAL_TEXT } from "@/content/agency-legal";
import { isLocale, toIntlLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies/privacy">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${AGENCY_LEGAL_TEXT[locale].privacy.title} · ${locale === "en" ? "Wsool" : "وصول"}` };
}

/** The agencies' own version (src/content/agency-legal.ts). */
export default async function AgencyLegal({ params }: PageProps<"/[locale]/agencies/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <LegalPage lang={locale} kind="privacy" audience="agency" />;
}
