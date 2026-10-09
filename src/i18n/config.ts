export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

/** Cookie that stores the visitor's chosen site language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Locale tag used for Intl formatting. Arabic is forced to Western digits
 * (0-9) because browsers default ar-* to Arabic-Indic digits.
 */
export function toIntlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-u-nu-latn" : "en";
}

/** Picks ar/en from an Accept-Language header, honouring q-values. */
export function localeFromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.lang && !Number.isNaN(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.map((entry) => entry.lang).find(isLocale);
}

/** Cookie choice wins, then device language, then Arabic. */
export function resolveLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return localeFromAcceptLanguage(acceptLanguage) ?? defaultLocale;
}

/** "ar-u-nu-latn" (next-intl's locale) -> "ar". */
export function fromIntlLocale(intl: string): Locale {
  return intl.startsWith("en") ? "en" : "ar";
}
