import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_TEXT } from "@/content/legal";
import { isLocale, toIntlLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${LEGAL_TEXT[locale].privacy.title} · ${locale === "en" ? "Wsool" : "وصول"}` };
}

export default async function Privacy({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <LegalPage lang={locale} kind="privacy" />;
}
