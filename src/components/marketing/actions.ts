"use server";

import { z } from "zod";
import { normalizeUsername } from "@/config/usernames";
import { isLocale } from "@/i18n/config";
import { subscribe } from "@/lib/newsletter";
import { clientIp, rateLimit } from "@/lib/rate-limit";
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
  // Per visitor and per address, so the form can't be used to mail-bomb someone. Still "ok" (no enumeration).
  if (!(await rateLimit(`nl-ip:${await clientIp()}`, 5, 3600)) || !(await rateLimit(`nl-email:${parsed.data}`, 3, 86400))) return { ok: true as const };
  await subscribe(parsed.data, isLocale(lang) ? lang : "ar", String(source ?? "home").slice(0, 40));
  return { ok: true as const };
}
