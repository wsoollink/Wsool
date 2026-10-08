"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { checkPassword, hashToken, unlockCookie, unlockValue } from "@/lib/investor";

/** Checks an investor link's password and remembers it for this browser (12 hours). */
export async function unlockInvestorLink(token: string, password: string) {
  const link = await db.investorLink.findUnique({ where: { tokenHash: hashToken(String(token)) } });
  if (!link || link.revokedAt || link.expiresAt < new Date() || !link.passwordHash) return { ok: false };
  // Small delay against guessing.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(String(password ?? ""), link.passwordHash)) return { ok: false };
  (await cookies()).set(unlockCookie(link.id), unlockValue(link.id), { httpOnly: true, secure: true, sameSite: "lax", path: "/invest", maxAge: 12 * 3600 });
  return { ok: true };
}
