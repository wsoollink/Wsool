import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDirection, isLocale, locales, toIntlLocale } from "@/i18n/config";
import { fontVariables } from "@/styles/fonts";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { NavProgress } from "@/components/NavProgress";
import "../../globals.css";
import { shareMeta } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  // Home and any page without its own: site name, the two-language tagline and the Wsool mark (src/lib/seo.ts).
  return shareMeta(locale, { title: t("title"), description: t("description"), path: "/" });
}

// Root layout for the marketing site, auth, dashboard and admin.
// Creator pages (/<username>) get their own root layout in Phase 2 so their
// language can follow the creator's settings.
export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));

  return (
    // data-theme is set by THEME_SCRIPT before paint, so React must not complain that it differs.
    <html lang={locale} dir={getDirection(locale)} className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}><NavProgress /></Suspense>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
