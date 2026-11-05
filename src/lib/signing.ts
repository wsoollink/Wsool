import "server-only";
import { createHmac } from "node:crypto";

/**
 * Keys for the HMAC signatures the site makes itself (newsletter links, private-view and investor cookies, the
 * visitor hash, mock payments). With SIGNING_SECRET set, each purpose gets its own key derived from it, so the
 * cron password (CRON_SECRET, sent over the network by the hourly job) no longer signs anything. Without it the
 * old shared key is used, so nothing changes until the owner adds the variable.
 */
export type SigningPurpose = "newsletter" | "private-view" | "investor" | "visitor" | "mock-payment";

const legacy = () => process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "local";

export function signingKey(purpose: SigningPurpose): string {
  const base = process.env.SIGNING_SECRET;
  return base ? createHmac("sha256", base).update(`wsool:${purpose}`).digest("base64url") : legacy();
}

/** The key before SIGNING_SECRET existed, to still accept links that were emailed with it (null when they're the same). */
export function legacySigningKey(): string | null {
  return process.env.SIGNING_SECRET ? legacy() : null;
}
