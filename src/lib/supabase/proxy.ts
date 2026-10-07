import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_PREFIX, supabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie (when there is one) and returns the
 * rewrite response carrying any updated cookies.
 */
export async function rewriteWithSession(request: NextRequest, destination: URL) {
  let response = NextResponse.rewrite(destination);

  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith(AUTH_COOKIE_PREFIX));
  if (!hasSession) return response;

  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.rewrite(destination, { request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Verifies the JWT and refreshes it when expired. Do not remove.
  await supabase.auth.getClaims();
  return response;
}
