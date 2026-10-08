import type { Locale } from "@/i18n/config";

/**
 * Creator page language (CLAUDE.md section 3): the visitor's language if the
 * creator offers it, otherwise the creator's primary language.
 */
export function pageLanguages(primary: Locale, enEnabled: boolean): Locale[] {
  return primary === "ar" ? (enEnabled ? ["ar", "en"] : ["ar"]) : ["en"];
}

export function resolvePageLang(visitor: Locale, primary: Locale, enEnabled: boolean): Locale {
  return pageLanguages(primary, enEnabled).includes(visitor) ? visitor : primary;
}
