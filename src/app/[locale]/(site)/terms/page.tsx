import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_TEXT } from "@/content/legal";
import { isLocale, toIntlLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${LEGAL_TEXT[locale].terms.title} · ${locale === "en" ? "Wsool" : "وصول"}` };
}

export default async function Terms({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <LegalPage lang={locale} kind="terms" />;
}
