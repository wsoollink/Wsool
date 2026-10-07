import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, toIntlLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    // Intl tag (forces 0-9 digits in Arabic). Use the [locale] route param, not
    // useLocale(), when you need the plain "ar" | "en" value.
    locale: toIntlLocale(locale),
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
