import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_TEXT } from "@/content/legal";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { shareMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/refund">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  return shareMeta(locale, { title: LEGAL_TEXT[locale].refund.title, description: m("refundDesc"), path: "/refund", canonical: true });
}

export default async function Refund({ params }: PageProps<"/[locale]/refund">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <LegalPage lang={locale} kind="refund" />;
}
