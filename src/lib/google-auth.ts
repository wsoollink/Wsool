import "server-only";
import { cacheLife } from "next/cache";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Whether Google sign-in is switched on in Supabase (Authentication → Sign In
 * / Providers → Google). The login button only shows when it is, so turning it
 * on or off there needs no code change. Checked at most every few minutes.
 */
export async function googleSignInEnabled(): Promise<boolean> {
  return (await enabledProviders()).google;
}

/** Same for Apple (Supabase → Providers → Apple): the "Continue with Apple" button shows only when it's on. */
export async function appleSignInEnabled(): Promise<boolean> {
  return (await enabledProviders()).apple;
}

async function enabledProviders(): Promise<{ google: boolean; apple: boolean }> {
  "use cache";
  cacheLife("minutes");
  try {
    const { url, key } = supabaseEnv();
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return { google: false, apple: false };
    const settings = (await res.json()) as { external?: { google?: boolean; apple?: boolean } };
    return { google: settings.external?.google === true, apple: settings.external?.apple === true };
  } catch {
    return { google: false, apple: false };
  }
}
