import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { siteOrigin } from "@/lib/site-url";

/**
 * Link previews (owner, Nov 2026): every shared page (WhatsApp, X, iMessage, Telegram) shows the site name and that page's
 * own description, in the page's language. WhatsApp shows og:title + og:description + the domain, so the name goes in the
 * title too ("Pricing · Wsool"). Next.js replaces a parent's openGraph instead of merging it, so pages build the whole set here.
 */
export const BRAND: Record<Locale, string> = { ar: "وصول", en: "Wsool" };
const SITE_NAME: Record<Locale, string> = { ar: "وصول | Wsool", en: "Wsool | وصول" };
const OG_LOCALE: Record<Locale, string> = { ar: "ar_SA", en: "en_US" };
/** The Wsool mark, used when a page has no picture of its own. */
export const SHARE_ICON = { url: "/brand/icon.png", width: 1024, height: 1024 };

export function withBrand(title: string, lang: Locale): string {
  return title.includes(BRAND[lang]) || title.includes("Wsool") ? title : `${title} · ${BRAND[lang]}`;
}

export function shareMeta(lang: Locale, o: {
  title: string;
  description: string;
  /** Site path ("/pricing"); the address the preview links to. */
  path: string;
  /** A large picture (1200 × 630 card); without it the square Wsool mark. */
  image?: { url: string; width?: number; height?: number; alt?: string };
  type?: "website" | "article" | "profile";
  /** Extra Open Graph fields (article dates, authors). */
  og?: Record<string, unknown>;
  robots?: Metadata["robots"];
  canonical?: boolean;
  /** Leave the title as given (it already reads as a full name, e.g. a creator's). */
  plainTitle?: boolean;
}): Metadata {
  const title = o.plainTitle ? o.title : withBrand(o.title, lang);
  const image = o.image ?? { ...SHARE_ICON, alt: BRAND[lang] };
  const large = Boolean(o.image);
  return {
    metadataBase: new URL(siteOrigin()),
    title,
    description: o.description,
    ...(o.robots && { robots: o.robots }),
    ...(o.canonical && { alternates: { canonical: o.path } }),
    openGraph: {
      type: o.type ?? "website", siteName: SITE_NAME[lang], locale: OG_LOCALE[lang],
      title, description: o.description, url: o.path, images: [image], ...o.og,
    } as Metadata["openGraph"],
    twitter: { card: large ? "summary_large_image" : "summary", title, description: o.description, images: [image] },
  };
}
