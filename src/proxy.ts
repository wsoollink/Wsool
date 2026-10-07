import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

/**
 * Public URLs never carry a language prefix (wsool.link/pricing,
 * wsool.link/<username>). The language is chosen from the cookie or the
 * device language, and the request is rewritten internally to
 * /<locale>/... so pages can be rendered per language.
 */
export function proxy(request: NextRequest) {
  const locale = resolveLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, API routes and static files. Usernames may contain
  // dots, so only real asset extensions are excluded.
  matcher: [
    "/((?!api/|_next/|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|webmanifest|json|css|js|map|woff2?|ttf|otf|pdf)$).*)",
  ],
};
