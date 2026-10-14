export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return { url, key };
}

/** Supabase auth cookies all start with this prefix. */
export const AUTH_COOKIE_PREFIX = "sb-";

/**
 * Session cookies are only read on the server (the browser client uploads to
 * signed URLs without a session), so page scripts never need them: httpOnly
 * keeps them out of reach of any injected script.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
