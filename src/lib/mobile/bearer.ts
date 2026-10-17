import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { CurrentUser } from "@/lib/auth";
import { supabaseEnv } from "@/lib/supabase/env";

/** Verifies "Bearer <Supabase access token>" (signature + expiry) and returns its user. */
export async function bearerUserFromHeader(header: string | null | undefined): Promise<CurrentUser | null> {
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token.length > 4096) return null;
  try {
    const { url, key } = supabaseEnv();
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.auth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    return { id: claims.sub, email: typeof claims.email === "string" ? claims.email.toLowerCase() : "" };
  } catch {
    // A malformed token makes the decoder throw: same as no token.
    return null;
  }
}
