import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Google sign-in that comes back to wsool.link itself (owner, Nov 2026), so Google's account picker says
 * "continue to wsool.link" instead of the Supabase project address. We run the OAuth code flow with our own
 * Google client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET = the same client set in Supabase → Providers → Google),
 * then hand Google's ID token to Supabase (signInWithIdToken), which checks it and opens the usual session.
 * Without the two env vars the old flow (through Supabase) is used.
 *
 * Google's redirect URI to add: https://wsool.link/api/auth/google/callback (+ each test origin).
 */
export const GOOGLE_STATE_COOKIE = "wsool_g";
export const GOOGLE_STATE_MAX_AGE = 600;

export function googleDirectConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** state (CSRF) + nonce (raw for Supabase; Google gets its SHA-256, as Supabase expects). */
export function newGoogleState() {
  const state = randomBytes(18).toString("base64url");
  const nonce = randomBytes(18).toString("base64url");
  return { state, nonce, hashedNonce: createHash("sha256").update(nonce).digest("hex") };
}

export function googleAuthUrl(redirectUri: string, state: string, hashedNonce: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce: hashedNonce,
    prompt: "select_account",
  }).toString();
  return u.toString();
}

export function sameState(a: string | undefined, b: string | null) {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Swaps the code for Google's ID token (server to server, with the client secret). */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, redirect_uri: redirectUri, grant_type: "authorization_code",
        client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[google-signin] token exchange failed", res.status);
      return null;
    }
    const data = (await res.json()) as { id_token?: string };
    return data.id_token ?? null;
  } catch (err) {
    console.error("[google-signin] token exchange error", err);
    return null;
  }
}
