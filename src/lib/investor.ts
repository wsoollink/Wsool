import "server-only";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Investor link tokens: only the SHA-256 is stored; the token is shown once. */
export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const given = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const secret = () => process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "local";
/** Cookie value proving the password was entered for this link. */
export const unlockValue = (linkId: string) => createHmac("sha256", secret()).update(`investor:${linkId}`).digest("base64url");
export const unlockCookie = (linkId: string) => `inv_${linkId.slice(0, 8)}`;
