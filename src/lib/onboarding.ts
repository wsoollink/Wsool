import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { normalizeUsername } from "@/config/usernames";
import { ensureAccount } from "@/lib/account";
import type { CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { usernameError, type UsernameError } from "@/lib/username";

export type ClaimResult = { ok: true; name: string } | { name: string; error: UsernameError | "failed" | "suspended" | "has_page" };

/**
 * Claims a username and creates the creator's page (first time only).
 * Shared by the website onboarding and the mobile app.
 */
export async function claimPage(user: CurrentUser, raw: string): Promise<ClaimResult> {
  const name = normalizeUsername(String(raw ?? "").slice(0, 40));
  // A suspended account can't take a name (same rule as requireCreator).
  if ((await db.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true } }))?.suspendedAt) return { name, error: "suspended" };
  const error = await usernameError(name, user.id);
  if (error) return { name, error };

  await ensureAccount(user);
  if (await db.page.findUnique({ where: { userId: user.id }, select: { id: true } })) return { name, error: "has_page" };
  try {
    await db.page.create({ data: { userId: user.id, username: name } });
  } catch (e) {
    // Someone else claimed it between the check and the insert.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { name, error: "taken" };
    return { name, error: "failed" };
  }
  return { ok: true, name };
}
