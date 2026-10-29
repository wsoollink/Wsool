"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureAccount } from "@/lib/account";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isReviewEmail, reviewTokenHash } from "@/lib/mobile/review-login";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  step: "email" | "code";
  email?: string;
  error?: "invalid_email" | "invalid_code" | "rate_limited" | "failed";
};

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
// Supabase OTP length is configurable (6 by default).
const codeSchema = z.string().trim().regex(/^\d{6,10}$/);

/** Step 1: email the visitor a one-time code (creates the account if new). */
export async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { step: "email", error: "invalid_email" };

  // Our own limits (Supabase only sees the server's IP): per visitor and per address.
  const ip = await clientIp();
  if (!(await rateLimit(`otp-ip:${ip}`, 10, 3600)) || !(await rateLimit(`otp-email:${email.data}`, 5, 3600))) {
    return { step: "email", email: email.data, error: "rate_limited" };
  }

  // Platform reviewers' address: the code is fixed (src/lib/mobile/review-login.ts), nothing to email.
  if (isReviewEmail(email.data)) return { step: "code", email: email.data };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true },
  });

  if (error) {
    const reason =
      error.code === "email_address_invalid" ? "invalid_email" : error.status === 429 ? "rate_limited" : "failed";
    return { step: "email", email: email.data, error: reason };
  }
  return { step: "code", email: email.data };
}

/** Step 2: check the code, create the account row on first sign-in. */
export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { step: "email", error: "invalid_email" };

  const code = codeSchema.safeParse(formData.get("code"));
  if (!code.success) return { step: "code", email: email.data, error: "invalid_code" };
  if (!(await rateLimit(`verify:${email.data}`, 10, 900)) || !(await rateLimit(`verify-ip:${await clientIp()}`, 30, 900))) {
    return { step: "code", email: email.data, error: "rate_limited" };
  }

  const supabase = await createSupabaseServerClient();
  // The reviewers' address signs in with its fixed code through a server-made token (sets the same session cookie).
  const reviewHash = isReviewEmail(email.data) ? await reviewTokenHash(email.data, code.data) : null;
  if (isReviewEmail(email.data) && !reviewHash) return { step: "code", email: email.data, error: "invalid_code" };
  const { data, error } = reviewHash
    ? await supabase.auth.verifyOtp({ token_hash: reviewHash, type: "magiclink" })
    : await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });

  if (error || !data.user) {
    return { step: "code", email: email.data, error: error?.status === 429 ? "rate_limited" : "invalid_code" };
  }

  await ensureAccount({ id: data.user.id, email: data.user.email ?? email.data });
  redirect("/dashboard");
}

/** Google: Supabase sends the visitor to Google, then back to /api/auth/callback. */
export async function signInWithGoogle() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${proto}://${host}/api/auth/callback`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
