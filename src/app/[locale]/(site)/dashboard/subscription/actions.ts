"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { setAutoRenew, setNextCycle, startCheckout, type CheckoutError } from "@/lib/billing";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { paymentProvider } from "@/lib/payments";
import { pageCacheTag } from "@/lib/public-page";

const cycle = z.enum(["monthly", "yearly"]);
const currency = z.enum(["SAR", "USD"]);

/** Starts checkout for the signed-in creator and sends the browser to the payment page. */
export async function checkout(cycleInput: string, currencyInput: string): Promise<{ error: CheckoutError } | void> {
  const { user, page } = await requireCreator();
  const c = cycle.safeParse(cycleInput), cur = currency.safeParse(currencyInput);
  if (!c.success || !cur.success || page.deletedAt) return { error: "failed" };
  // The test provider is for the team only, so nobody gets Pro for free.
  if (paymentProvider()?.testOnly && !(await getAdmin())) return { error: "disabled" };
  const res = await startCheckout(user, c.data, cur.data);
  if ("error" in res) return res;
  redirect(res.url);
}

export async function toggleAutoRenew(on: boolean) {
  const { user } = await requireCreator();
  return { ok: await setAutoRenew(user.id, !!on) };
}

export async function changeCycle(next: string) {
  const { user } = await requireCreator();
  const c = cycle.safeParse(next);
  return { ok: c.success && (await setNextCycle(user.id, c.data)) };
}

/**
 * Self-service deletion (CLAUDE.md section 8): the creator types their
 * username, the page is hidden right away, auto-renew stops, and everything
 * is deleted for good after 30 days unless they undo it.
 */
export async function requestDeletion(confirmUsername: string) {
  const { user, page } = await requireCreator();
  if (String(confirmUsername ?? "").trim().toLowerCase() !== page.username) return { ok: false };
  await db.$transaction([
    db.page.update({ where: { id: page.id }, data: { deletedAt: new Date() } }),
    db.subscription.updateMany({ where: { userId: user.id, status: { in: ["active", "past_due"] } }, data: { cancelAtPeriodEnd: true } }),
  ]);
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}

export async function undoDeletion() {
  const { page } = await requireCreator();
  await db.page.update({ where: { id: page.id }, data: { deletedAt: null } });
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}
