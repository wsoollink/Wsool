import { NextResponse, type NextRequest } from "next/server";
import { ensureAccount } from "@/lib/account";
import { requestOrigin } from "@/lib/connect";
import { exchangeGoogleCode, GOOGLE_STATE_COOKIE, googleDirectConfigured, sameState } from "@/lib/google-oauth";
import { NEXT_COOKIE, safeNextPath } from "@/lib/next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Google comes back here with a code: check the state, swap the code for Google's ID token, let Supabase verify
 * it (signInWithIdToken, with the nonce) and open the session, then the same first sign-in steps as email sign-up.
 */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const back = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };
  const sp = request.nextUrl.searchParams;
  const [state, nonce] = (request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  const code = sp.get("code");
  // Cancelled at Google, a stale/forged state, or the feature switched off.
  if (!googleDirectConfigured() || !code || !nonce || !sameState(state, sp.get("state"))) return back("/login?error=google");

  const idToken = await exchangeGoogleCode(code, `${origin}/api/auth/google/callback`);
  if (!idToken) return back("/login?error=google");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken, nonce });
  if (error || !data.user?.email) {
    console.error("[google-signin] supabase rejected the token", error?.message);
    return back("/login?error=google");
  }
  await ensureAccount({ id: data.user.id, email: data.user.email.toLowerCase() });
  const res = back(safeNextPath(request.cookies.get(NEXT_COOKIE)?.value) ?? "/dashboard");
  res.cookies.delete(NEXT_COOKIE);
  return res;
}
