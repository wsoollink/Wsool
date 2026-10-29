import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { supabaseForApi } from "@/lib/mobile/api";

/**
 * Store and platform review sign-in (owner, Oct 2026): App Store / Google Play reviewers (app) and Meta / TikTok /
 * Google reviewers (website) can't receive our emailed codes,
 * so ONE address (`REVIEW_EMAIL`) signs in with a fixed code (`REVIEW_CODE`, 8-10 digits), both Netlify
 * secrets. Off unless both are set. No email is sent for that address; every other address works as usual.
 * The usual verify rate limits still apply, so the code can't be guessed.
 */
function reviewLogin() {
  const email = process.env.REVIEW_EMAIL?.trim().toLowerCase();
  const code = process.env.REVIEW_CODE?.trim();
  return email && code && /^\d{8,10}$/.test(code) ? { email, code } : null;
}

export const isReviewEmail = (email: string) => reviewLogin()?.email === email;

/** A one-time sign-in token for the review account when the code matches (nothing is emailed); null otherwise. */
export async function reviewTokenHash(email: string, code: string): Promise<string | null> {
  const login = reviewLogin();
  if (!login || login.email !== email) return null;
  const given = Buffer.from(code), expected = Buffer.from(login.code);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const admin = createSupabaseAdmin().auth.admin;
  // Make sure the account exists and is confirmed (an "already registered" error just means it does).
  await admin.createUser({ email, email_confirm: true });
  const { data: link, error } = await admin.generateLink({ type: "magiclink", email });
  return error ? null : link.properties?.hashed_token ?? null;
}

/** App: a session for the review account when the code matches; null for anyone else or a wrong code. */
export async function reviewSession(email: string, code: string): Promise<{ session: Session; userId: string } | null> {
  const hash = await reviewTokenHash(email, code);
  if (!hash) return null;
  const { data, error: verifyError } = await supabaseForApi().auth.verifyOtp({ token_hash: hash, type: "magiclink" });
  if (verifyError || !data.session || !data.user) return null;
  return { session: data.session, userId: data.user.id };
}
