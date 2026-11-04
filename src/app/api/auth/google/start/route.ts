import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/connect";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_MAX_AGE, googleAuthUrl, googleDirectConfigured, newGoogleState } from "@/lib/google-oauth";

/** Starts Google sign-in that returns to this site (src/lib/google-oauth.ts). The "next" path is already in its cookie. */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  if (!googleDirectConfigured()) return NextResponse.redirect(new URL("/login?error=google", origin));
  const { state, nonce, hashedNonce } = newGoogleState();
  const res = NextResponse.redirect(googleAuthUrl(`${origin}/api/auth/google/callback`, state, hashedNonce));
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${nonce}`, {
    httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), path: "/api/auth/google", maxAge: GOOGLE_STATE_MAX_AGE,
  });
  return res;
}
