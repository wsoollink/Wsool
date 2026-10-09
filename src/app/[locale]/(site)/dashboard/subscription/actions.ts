"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { CANCEL_REASONS } from "@/config/plans";
import { getAdmin } from "@/lib/admin";
import { setAutoRenew, setNextCycle, startCheckout, type CheckoutError } from "@/lib/billing";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { paymentProvider } from "@/lib/payments";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";
import { notify } from "@/lib/notify";
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

const feedbackSchema = z.object({ reason: z.enum(CANCEL_REASONS), note: z.string().trim().max(300).default("") });

/** Auto-renew on/off. Turning it off can carry the "why are you cancelling?" answer. */
export async function toggleAutoRenew(on: boolean, feedback?: { reason: string; note?: string }) {
  const { user } = await requireCreator();
  const ok = await setAutoRenew(user.id, !!on);
  const parsed = feedback ? feedbackSchema.safeParse(feedback) : null;
  if (ok && !on && parsed?.success) {
    await db.cancellationFeedback.create({ data: { userId: user.id, reason: parsed.data.reason, note: parsed.data.note || null } });
  }
  return { ok };
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
  await notify(user.id, "deletion_scheduled", { purgeDate: new Date(Date.now() + DELETE_AFTER_DAYS * 86_400_000).toISOString() });
  return { ok: true };
}

export async function undoDeletion() {
  const { page } = await requireCreator();
  await db.page.update({ where: { id: page.id }, data: { deletedAt: null } });
  updateTag(pageCacheTag(page.username));
  return { ok: true };
}
