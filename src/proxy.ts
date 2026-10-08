import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { rewriteWithSession } from "@/lib/supabase/proxy";

/**
 * Public URLs never carry a language prefix (wsool.link/pricing,
 * wsool.link/<username>). The language is chosen from the cookie or the
 * device language, and the request is rewritten internally to
 * /<locale>/... so pages can be rendered per language.
 * Signed-in visitors also get their Supabase session refreshed here.
 */
export async function proxy(request: NextRequest) {
  const locale = resolveLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  return rewriteWithSession(request, url);
}

export const config = {
  // Skip Next internals, API routes and static files. Usernames may contain
  // dots, so only real asset extensions are excluded (keep in sync with
  // ASSET_EXTENSIONS in src/config/usernames.ts).
  matcher: [
    "/((?!api/|_next/|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|webmanifest|json|css|js|map|woff2?|ttf|otf|pdf|mp4|webm|mov|m4v)$).*)",
  ],
};
