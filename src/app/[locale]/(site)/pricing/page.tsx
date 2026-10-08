import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PricingPage } from "@/components/marketing/Pages";
import { isLocale, toIntlLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "en" ? "Pricing · Wsool" : "الأسعار · وصول" };
}

export default async function Pricing({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <PricingPage lang={locale} />;
}
