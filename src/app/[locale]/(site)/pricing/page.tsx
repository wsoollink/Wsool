import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PricingPage } from "@/components/marketing/Pages";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { shareMeta } from "@/lib/seo";
import { PRICES, TRIAL_DAYS } from "@/config/plans";

export async function generateMetadata({ params }: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  const p = PRICES[locale === "en" ? "USD" : "SAR"];
  return shareMeta(locale, { title: m("pricingTitle"), description: m("pricingDesc", { month: p.monthly, year: p.yearly, days: TRIAL_DAYS }), path: "/pricing", canonical: true });
}

export default async function Pricing({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <PricingPage lang={locale} />;
}
