import "server-only";
import { cache } from "react";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { normalizeUsername, usernameFormatError } from "@/config/usernames";
import { resolvePageLang } from "@/lib/page-language";
import { getPublicPage } from "@/lib/public-page";

/**
 * Shared by the creator layout, page and metadata: the page data and the
 * language to render it in (visitor's language if offered, else primary).
 */
export const loadCreatorPage = cache(async (localeParam: string, usernameParam: string) => {
  const visitor: Locale = isLocale(localeParam) ? localeParam : defaultLocale;
  const raw = decodeURIComponent(usernameParam);
  const username = normalizeUsername(raw);
  // Reserved names can't be claimed, but staff-made pages (e.g. /demo) still show.
  const formatError = usernameFormatError(username);
  const data = formatError && formatError !== "reserved" ? null : await getPublicPage(username);
  const lang = data?.status === "published" ? resolvePageLang(visitor, data.primaryLang, data.enEnabled) : visitor;
  return { raw, username, data, lang };
});
