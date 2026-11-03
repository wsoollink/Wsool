import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_PREFIX, SESSION_COOKIE_OPTIONS, supabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie (when there is one) and returns the
 * rewrite response carrying any updated cookies.
 */
export async function rewriteWithSession(request: NextRequest, destination: URL, extraHeaders: Record<string, string> = {}) {
  // Extra request headers for the page (e.g. the visitor's real path), forwarded on every rewrite below.
  const forward = () => {
    const h = new Headers(request.headers);
    for (const [k, v] of Object.entries(extraHeaders)) h.set(k, v);
    return h;
  };
  let response = NextResponse.rewrite(destination, { request: { headers: forward() } });

  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith(AUTH_COOKIE_PREFIX));
  if (!hasSession) return response;

  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.rewrite(destination, { request: { headers: forward() } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Verifies the JWT and refreshes it when expired. Do not remove.
  await supabase.auth.getClaims();
  return response;
}
