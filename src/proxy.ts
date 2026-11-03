import { NextResponse, type NextRequest } from "next/server";
import { REF_PARAM } from "@/config/referrals";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { rewriteWithSession } from "@/lib/supabase/proxy";
import { PATH_HEADER } from "@/lib/next-path";

/**
 * Public URLs never carry a language prefix (wsool.link/pricing,
 * wsool.link/<username>). The language is chosen from the cookie or the
 * device language, and the request is rewritten internally to
 * /<locale>/... so pages can be rendered per language.
 * Signed-in visitors also get their Supabase session refreshed here.
 */
export async function proxy(request: NextRequest) {
  // Referral links (?ref=<username>): counted and remembered by /api/ref, which comes back without the parameter.
  const ref = request.nextUrl.searchParams.get(REF_PARAM);
  if (ref !== null && request.method === "GET") {
    const next = request.nextUrl.clone();
    next.searchParams.delete(REF_PARAM);
    const landing = new URL("/api/ref", request.url);
    landing.searchParams.set("u", ref.slice(0, 40));
    landing.searchParams.set("next", next.pathname + next.search);
    return NextResponse.redirect(landing, 307);
  }

  // Private links to a creator's full page (wsool.link/<username>?k=<token>): /api/unlock checks the token, sets the
  // unlock cookie and comes back to the clean page URL.
  const key = request.nextUrl.searchParams.get("k");
  const single = /^\/[^/]+$/.exec(request.nextUrl.pathname);
  if (key !== null && single && request.method === "GET") {
    const landing = new URL("/api/unlock", request.url);
    landing.searchParams.set("u", decodeURIComponent(request.nextUrl.pathname.slice(1)).slice(0, 40));
    landing.searchParams.set("k", key.slice(0, 64));
    return NextResponse.redirect(landing, 307);
  }

  const locale = resolveLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  // The path the visitor asked for, so a page that needs sign-in can send them back there (src/lib/auth.ts loginUrl).
  return rewriteWithSession(request, url, { [PATH_HEADER]: request.nextUrl.pathname + request.nextUrl.search });
}

export const config = {
  // Skip Next internals, API routes and static files. Usernames may contain
  // dots, so only real asset extensions are excluded (keep in sync with
  // ASSET_EXTENSIONS in src/config/usernames.ts).
  matcher: [
    "/((?!api/|_next/|\\.well-known/|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|webmanifest|json|css|js|map|woff2?|ttf|otf|pdf|mp4|webm|mov|m4v)$).*)",
  ],
};
