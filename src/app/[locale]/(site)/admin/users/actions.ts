"use server";

import { updateTag } from "next/cache";
import { TRIAL_EXTENSIONS } from "@/config/admin";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";

export type UserActionResult = { ok?: boolean; error?: "failed" | "has_paid_plan" };

async function refreshPage(userId: string) {
  const page = await db.page.findUnique({ where: { userId }, select: { username: true } });
  if (page) updateTag(pageCacheTag(page.username));
}

/** Adds days to the Pro trial (from today or from the current end, whichever is later). */
export async function extendTrial(userId: string, days: number): Promise<UserActionResult> {
  const admin = await requireAdmin("trial.extend");
  if (!(TRIAL_EXTENSIONS as readonly number[]).includes(days)) return { error: "failed" };
  const sub = await db.subscription.findUnique({ where: { userId: String(userId) } });
  if (!sub) return { error: "failed" };
  if (sub.status === "active") return { error: "has_paid_plan" };

  const from = Math.max(Date.now(), sub.trialEndsAt?.getTime() ?? 0);
  const trialEndsAt = new Date(from + days * 86_400_000);
  await db.$transaction(async (tx) => {
    await tx.subscription.update({ where: { id: sub.id }, data: { status: "trialing", plan: "pro", trialEndsAt } });
    await audit(admin, "user.trial_extend", { type: "user", id: sub.userId }, { days, trialEndsAt: trialEndsAt.toISOString() }, tx);
  });
  await refreshPage(sub.userId);
  return { ok: true };
}

/** Suspends (page hidden, no dashboard) or restores an account. The owner's account can't be suspended here. */
export async function setSuspended(userId: string, suspend: boolean, note: string): Promise<UserActionResult> {
  const admin = await requireAdmin("users.suspend");
  const user = await db.user.findUnique({ where: { id: String(userId) }, select: { id: true } });
  if (!user || user.id === admin.userId) return { error: "failed" };
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { suspendedAt: suspend ? new Date() : null } });
    await audit(admin, suspend ? "user.suspend" : "user.unsuspend", { type: "user", id: user.id }, { note: String(note ?? "").slice(0, 300) }, tx);
  });
  await refreshPage(user.id);
  return { ok: true };
}

/** Hides or publishes a creator's page (e.g. reported content). */
export async function setPagePublished(userId: string, publish: boolean): Promise<UserActionResult> {
  const admin = await requireAdmin("users.edit");
  const page = await db.page.findUnique({ where: { userId: String(userId) }, select: { id: true, userId: true } });
  if (!page) return { error: "failed" };
  await db.$transaction(async (tx) => {
    await tx.page.update({ where: { id: page.id }, data: { isPublished: publish } });
    await audit(admin, publish ? "page.publish" : "page.hide", { type: "user", id: page.userId }, undefined, tx);
  });
  await refreshPage(page.userId);
  return { ok: true };
}
