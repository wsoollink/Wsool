import type { Currency } from "@/generated/prisma/enums";
import { toIntlLocale, type Locale } from "@/i18n/config";

// All formatting goes through toIntlLocale, so Arabic always uses 0-9.

export function formatNumber(value: number, lang: Locale) {
  return new Intl.NumberFormat(toIntlLocale(lang)).format(value);
}

/** 1240000 -> "1.2M" / "1.2 مليون". */
export function formatCompact(value: number, lang: Locale) {
  return new Intl.NumberFormat(toIntlLocale(lang), { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPrice(value: number, currency: Currency, lang: Locale) {
  return new Intl.NumberFormat(toIntlLocale(lang), {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** 15 -> "15%" (direction-safe in Arabic). */
export function formatPercent(value: number, lang: Locale) {
  return new Intl.NumberFormat(toIntlLocale(lang), { style: "percent", maximumFractionDigits: 0 }).format(value / 100);
}
