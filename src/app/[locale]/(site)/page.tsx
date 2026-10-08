import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HomePage } from "@/components/marketing/Pages";
import { isLocale, toIntlLocale } from "@/i18n/config";

/** Marketing home page (the owner's approved design, design/marketing). */
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <HomePage lang={locale} />;
}
