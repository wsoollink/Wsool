import "server-only";
import { cacheLife } from "next/cache";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Whether Google sign-in is switched on in Supabase (Authentication → Sign In
 * / Providers → Google). The login button only shows when it is, so turning it
 * on or off there needs no code change. Checked at most every few minutes.
 */
export async function googleSignInEnabled(): Promise<boolean> {
  "use cache";
  cacheLife("minutes");
  try {
    const { url, key } = supabaseEnv();
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
