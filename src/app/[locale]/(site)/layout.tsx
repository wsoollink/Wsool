import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDirection, isLocale, locales, toIntlLocale } from "@/i18n/config";
import { fontVariables } from "@/styles/fonts";
import "../../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  return { title: t("title"), description: t("description") };
}

// Root layout for the marketing site, auth, dashboard and admin.
// Creator pages (/<username>) get their own root layout in Phase 2 so their
// language can follow the creator's settings.
export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));

  return (
    <html lang={locale} dir={getDirection(locale)} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
