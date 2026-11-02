"use server";

import { cookies } from "next/headers";
import { hasPro } from "@/config/plans";
import { db } from "@/lib/db";
import { checkPassword } from "@/lib/investor";
import { passwordUnlock, unlockCookieName, unlockCookieOptions } from "@/lib/private-view";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type UnlockResult = { ok?: boolean; error?: "wrong" | "limit" };

/** The page password typed on the lock card. 10 tries per 15 minutes per visitor + page, 50 per page. */
export async function unlockPage(username: string, password: string): Promise<UnlockResult> {
  const name = String(username).toLowerCase().slice(0, 20);
  const given = String(password ?? "").slice(0, 64);
  const ip = await clientIp();
  if (!(await rateLimit(`unlock:${ip}:${name}`, 10, 900)) || !(await rateLimit(`unlock:${name}`, 50, 900))) return { error: "limit" };
  const page = await db.page.findUnique({
    where: { username: name },
    select: { id: true, privatePassword: true, privateVersion: true, isPublished: true, deletedAt: true, user: { select: { suspendedAt: true, subscription: { select: { plan: true, status: true, trialEndsAt: true } } } } },
  });
  if (!page?.privatePassword || !page.isPublished || page.deletedAt || page.user.suspendedAt || !hasPro(page.user.subscription)) return { error: "wrong" };
  if (!given || !checkPassword(given, page.privatePassword)) return { error: "wrong" };
  (await cookies()).set(unlockCookieName(page.id), passwordUnlock(page.id, page.privateVersion), unlockCookieOptions);
  return { ok: true };
}
