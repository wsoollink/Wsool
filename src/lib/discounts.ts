import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";

/** A code is valid this many days after it's made (owner decision). */
export const DISCOUNT_DAYS = 30;
/** Percent range staff can give; a free first payment isn't possible (the card must be charged once). */
export const DISCOUNT_MIN = 5;
export const DISCOUNT_MAX = 90;
/** Codes made in one go. */
export const DISCOUNT_BATCH_MAX = 50;

// No 0/O/1/I/L: easy to read out and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const generateCode = () => `WSL-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

/** What the creator typed → stored form ("wsl 7kq2m9" → "WSL-7KQ2M9"). */
export function normalizeCode(input: string) {
  const v = input.trim().toUpperCase().replace(/[\s_–—]/g, "-");
  return /^WSL[A-Z0-9]{6}$/.test(v) ? `WSL-${v.slice(3)}` : v.slice(0, 20);
}

/** Price after the discount, rounded to the cent. */
export const discountedPrice = (price: number, percent: number) => Math.round(price * (100 - percent)) / 100;

export type CodeStatus = "unused" | "used" | "expired" | "revoked";
export function codeStatus(c: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now = new Date()): CodeStatus {
  if (c.usedAt) return "used";
  if (c.revokedAt) return "revoked";
  return c.expiresAt <= now ? "expired" : "unused";
}

export type CodeError = "invalid" | "expired" | "used" | "not_yours";

/**
 * Checks a code for this account before checkout. Same answer ("invalid")
 * for unknown and revoked codes, so codes can't be probed.
 */
export async function checkDiscountCode(input: string, user: { email: string }): Promise<{ id: string; code: string; percent: number } | { error: CodeError }> {
  const code = normalizeCode(input);
  if (!/^WSL-[A-Z0-9]{6}$/.test(code)) return { error: "invalid" };
  const row = await db.discountCode.findUnique({ where: { code } });
  if (!row || row.revokedAt) return { error: "invalid" };
  if (row.email && row.email !== user.email.toLowerCase()) return { error: "not_yours" };
  const status = codeStatus(row);
  if (status === "used") return { error: "used" };
  if (status === "expired") return { error: "expired" };
  return { id: row.id, code: row.code, percent: row.percent };
}
