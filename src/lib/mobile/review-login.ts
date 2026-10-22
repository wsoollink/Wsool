import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { supabaseForApi } from "@/lib/mobile/api";

/**
 * App Store / Google Play review sign-in (owner, Oct 2026): store reviewers can't receive our emailed codes,
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

/** A session for the review account when the code matches; null for anyone else or a wrong code. */
export async function reviewSession(email: string, code: string): Promise<{ session: Session; userId: string } | null> {
  const login = reviewLogin();
  if (!login || login.email !== email) return null;
  const given = Buffer.from(code), expected = Buffer.from(login.code);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const admin = createSupabaseAdmin().auth.admin;
  // Make sure the account exists and is confirmed (an "already registered" error just means it does).
  await admin.createUser({ email, email_confirm: true });
  // A one-time sign-in token made on the server (nothing is emailed), then exchanged like a normal code.
  const { data: link, error } = await admin.generateLink({ type: "magiclink", email });
  if (error || !link.properties?.hashed_token) return null;
  const { data, error: verifyError } = await supabaseForApi().auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (verifyError || !data.session || !data.user) return null;
  return { session: data.session, userId: data.user.id };
}
