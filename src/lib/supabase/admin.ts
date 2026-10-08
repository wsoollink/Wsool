import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Supabase client with the secret key. Server only, never sent to the
 * browser. Used for storage (signed upload URLs, cleanup).
 */
export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createClient(supabaseEnv().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
