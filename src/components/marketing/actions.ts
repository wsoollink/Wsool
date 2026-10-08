"use server";

import { z } from "zod";
import { normalizeUsername } from "@/config/usernames";
import { isLocale } from "@/i18n/config";
import { subscribe } from "@/lib/newsletter";
import { usernameError, type UsernameError } from "@/lib/username";

/** Public availability check for the "claim your link" boxes (no sign-in needed). */
export async function checkLink(raw: string): Promise<{ name: string; error: UsernameError | null }> {
  const name = normalizeUsername(String(raw ?? "").slice(0, 40));
  return { name, error: await usernameError(name) };
}

const emailSchema = z.email().max(254);

/** Newsletter sign-up (double opt-in). Always "ok" for valid emails. */
export async function joinNewsletter(email: string, lang: string, source: string) {
  const parsed = emailSchema.safeParse(String(email ?? "").trim().toLowerCase());
  if (!parsed.success) return { ok: false as const };
  await subscribe(parsed.data, isLocale(lang) ? lang : "ar", String(source ?? "home").slice(0, 40));
  return { ok: true as const };
}
