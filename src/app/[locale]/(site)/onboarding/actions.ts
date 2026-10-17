"use server";

import { redirect } from "next/navigation";
import { normalizeUsername } from "@/config/usernames";
import { requireUser } from "@/lib/auth";
import { claimPage } from "@/lib/onboarding";
import { usernameError, type UsernameError } from "@/lib/username";

export type AvailabilityResult = { name: string; error: UsernameError | null };

/** Live availability check while the creator types. */
export async function checkUsername(raw: string): Promise<AvailabilityResult> {
  const user = await requireUser();
  const name = normalizeUsername(String(raw).slice(0, 40));
  return { name, error: await usernameError(name, user.id) };
}

export type ClaimState = { name?: string; error?: UsernameError | "failed" };

/** Claims the username and creates the creator's page (first time only). */
export async function claimUsername(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const user = await requireUser();
  const res = await claimPage(user, String(formData.get("username") ?? ""));
  if ("ok" in res || res.error === "has_page") redirect("/dashboard");
  if (res.error === "suspended") redirect("/suspended");
  return { name: res.name, error: res.error };
}
