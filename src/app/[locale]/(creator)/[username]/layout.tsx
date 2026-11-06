import { NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDirection, locales, toIntlLocale } from "@/i18n/config";
import { loadCreatorPage } from "@/lib/creator-page";
import { shareMeta } from "@/lib/seo";
import { fontVariables } from "@/styles/fonts";
import "../../../globals.css";

// Cache Components needs one known param to validate the route at build time.
// "_" is not a valid username, so it renders the not-found page.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale, username: "_" }));
}

// Fallback preview for a link with no page behind it (the not-found page): the site name + an invite to claim it.
// Real pages replace it in page.tsx.
export async function generateMetadata({ params }: LayoutProps<"/[locale]/[username]">): Promise<Metadata> {
  const { locale, username } = await params;
  const { lang } = await loadCreatorPage(locale, username);
  const m = await getTranslations({ locale: toIntlLocale(lang), namespace: "Metadata" });
  return shareMeta(lang, { title: m("notFoundTitle"), description: m("notFoundDesc"), path: "/", robots: { index: false } });
}

// Root layout for public creator pages (wsool.link/<username>): the html lang
// and direction follow the creator's language settings, not the site cookie.
export default async function CreatorLayout({ children, params }: LayoutProps<"/[locale]/[username]">) {
  const { locale, username } = await params;
  const { lang } = await loadCreatorPage(locale, username);
  setRequestLocale(toIntlLocale(lang));

  return (
    <html lang={lang} dir={getDirection(lang)} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
