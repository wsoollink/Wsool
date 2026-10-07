"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureAccount } from "@/lib/account";
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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type: "email",
  });

  if (error || !data.user) {
    return { step: "code", email: email.data, error: error?.status === 429 ? "rate_limited" : "invalid_code" };
  }

  await ensureAccount({ id: data.user.id, email: data.user.email ?? email.data });
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
