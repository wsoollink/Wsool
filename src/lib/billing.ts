import "server-only";
import { addCycle, PRICES, RENEWAL_RETRY_DAYS, vatPart } from "@/config/plans";
import type { BillingCycle, Currency } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { checkDiscountCode, discountedPrice, type CodeError } from "@/lib/discounts";
import { paymentProvider, type Payment } from "@/lib/payments";
import { notify } from "@/lib/notify";
import { expirePage } from "@/lib/public-page";
import { cancelCommissionForRefund, earnCommission, renewalCredit } from "@/lib/referrals";
import { siteOrigin } from "@/lib/site-url";

/** "WS-001042" */
export const invoiceLabel = (n: number | null) => (n ? `WS-${String(n).padStart(6, "0")}` : "—");

async function refreshPage(userId: string) {
  const page = await db.page.findUnique({ where: { userId }, select: { username: true } });
  if (page) expirePage(page.username);
}

/** Where a new paid period starts: after any trial time or paid time that's left. */
function periodStart(sub: { status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null }, now: Date) {
  let start = now;
  if (sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt > start) start = sub.trialEndsAt;
  if ((sub.status === "active" || sub.status === "past_due") && sub.currentPeriodEnd && sub.currentPeriodEnd > start) start = sub.currentPeriodEnd;
  return start;
}

export type CheckoutError = "disabled" | "already_active" | "failed" | CodeError;

/**
 * Starts a Pro checkout for the signed-in user: creates a pending invoice and
 * returns the payment page URL. Prices come from config, never the browser.
 */
export async function startCheckout(user: { id: string; email: string }, cycle: BillingCycle, currency: Currency, discountCode?: string): Promise<{ url: string } | { error: CheckoutError }> {
  const provider = paymentProvider();
  if (!provider) return { error: "disabled" };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!sub) return { error: "failed" };
  if (sub.status === "active" && !sub.cancelAtPeriodEnd) return { error: "already_active" };

  // A discount code (first payment only) is checked again here, whatever the browser showed.
  const discount = discountCode ? await checkDiscountCode(discountCode, user) : null;
  if (discount && "error" in discount) return { error: discount.error };
  // A free (100%) code is redeemed without checkout (redeemFreeCode).
  if (discount && discount.percent >= 100) return { error: "failed" };
  // One open checkout per code: while someone else's invoice with it is being paid (last hour), it's taken.
  // (Codes are only marked used when a payment settles, so this stops one shared code paying for many.)
  if (discount) {
    const busy = await db.invoice.count({
      where: { discountCodeId: discount.id, status: "pending", userId: { not: user.id }, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    });
    if (busy) return { error: "used" };
    // Earlier unpaid checkouts of this user with the same code are dropped, so only one can be paid.
    await db.invoice.updateMany({ where: { discountCodeId: discount.id, status: "pending", userId: user.id }, data: { status: "failed", failureReason: "replaced" } });
  }
  const full = PRICES[currency][cycle];
  const amount = discount ? discountedPrice(full, discount.percent) : full;
  const invoice = await db.invoice.create({
    data: {
      userId: user.id, subscriptionId: sub.id, kind: "checkout", cycle, currency,
      amount, vatAmount: vatPart(amount), provider: provider.name,
      ...(discount && { discountCodeId: discount.id, discountAmount: Math.round((full - amount) * 100) / 100 }),
    },
  });
  try {
    const { url } = await provider.startCheckout({
      invoiceId: invoice.id, amount, currency, customerEmail: user.email,
      description: `Wsool Pro (${cycle})`,
      returnUrl: `${siteOrigin()}/billing/return?invoice=${invoice.id}`,
    });
    return { url };
  } catch {
    await db.invoice.update({ where: { id: invoice.id }, data: { status: "failed", failureReason: "Could not start checkout" } });
    return { error: "failed" };
  }
}

export type RedeemError = CodeError | "not_free" | "already_active" | "failed";

/**
 * Redeems a 100% code: Pro for the code's period (one month or one year) with
 * no payment. Starts after any trial or paid time left. Never renews (no card):
 * when it ends the page drops to Free like a cancelled plan, nothing is deleted.
 */
export async function redeemFreeCode(user: { id: string; email: string }, input: string): Promise<{ until: Date } | { error: RedeemError }> {
  const code = await checkDiscountCode(input, user);
  if ("error" in code) return code;
  if (code.percent < 100 || !code.freeCycle) return { error: "not_free" };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!sub) return { error: "failed" };
  // Already paying with auto-renew: a free code would only overlap a paid plan.
  if (sub.status === "active" && !sub.cancelAtPeriodEnd) return { error: "already_active" };
  const now = new Date();
  const end = addCycle(periodStart(sub, now), code.freeCycle);
  const ok = await db.$transaction(async (tx) => {
    const { count } = await tx.discountCode.updateMany({ where: { id: code.id, usedAt: null, revokedAt: null }, data: { usedAt: now, usedBy: user.id } });
    if (count !== 1) return false;
    await tx.subscription.update({
      where: { id: sub.id },
      data: { plan: "pro", status: "active", cycle: code.freeCycle, currentPeriodEnd: end, cancelAtPeriodEnd: true, failedAttempts: 0, nextRetryAt: null },
    });
    return true;
  });
  if (!ok) return { error: "used" };
  await notify(user.id, "free_activated", { endDate: end.toISOString() });
  return { until: end };
}

/**
 * Applies a payment the provider confirmed to its invoice: checks it matches
 * (invoice, amount, currency), then marks the invoice paid and extends Pro.
 * Safe to call twice (return page + webhook): an already-settled invoice is left alone.
 */
export async function settleCheckout(invoiceId: string, payment: Payment): Promise<"paid" | "failed" | "pending" | "mismatch"> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: { subscription: true } });
  if (!invoice || payment.invoiceId !== invoice.id) return "mismatch";
  if (invoice.status === "paid") return "paid";
  if (Math.abs(Number(invoice.amount) - payment.amount) > 0.001 || invoice.currency !== payment.currency) return "mismatch";
  if (payment.status === "pending") return "pending";

  if (payment.status === "failed") {
    await db.invoice.updateMany({ where: { id: invoice.id, status: "pending" }, data: { status: "failed", providerPaymentId: payment.id, failureReason: payment.failureReason?.slice(0, 200) } });
    return "failed";
  }

  const now = new Date();
  const start = periodStart(invoice.subscription, now);
  const end = addCycle(start, invoice.cycle);
  const done = await db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
    const { count } = await tx.invoice.updateMany({
      where: { id: invoice.id, status: { in: ["pending", "failed"] } },
      data: { status: "paid", number: Number(nextval), providerPaymentId: payment.id, paidAt: now, periodStart: start, periodEnd: end, failureReason: null },
    });
    if (count !== 1) return false;
    // The code is spent once its payment goes through (a code used meanwhile stays with its first invoice).
    if (invoice.discountCodeId) {
      await tx.discountCode.updateMany({
        where: { id: invoice.discountCodeId, usedAt: null },
        data: { usedAt: now, usedBy: invoice.userId, invoiceId: invoice.id },
      });
    }
    await tx.subscription.update({
      where: { id: invoice.subscriptionId },
      data: {
        plan: "pro", status: "active", cycle: invoice.cycle, currency: invoice.currency, currentPeriodEnd: end,
        cancelAtPeriodEnd: false, failedAttempts: 0, nextRetryAt: null, provider: invoice.provider,
        ...(payment.token && { paymentToken: payment.token, paymentMethodLabel: payment.methodLabel?.slice(0, 60) ?? null }),
      },
    });
    return true;
  });
  if (done) {
    await refreshPage(invoice.userId);
    const paid = await db.invoice.findUnique({ where: { id: invoice.id }, select: { number: true } });
    await notify(invoice.userId, "payment_receipt", { invoice: invoiceLabel(paid?.number ?? null), amount: Number(invoice.amount), currency: invoice.currency, periodEndDate: end.toISOString() });
    await earnCommission(invoice.id);
  }
  return "paid";
}

/** Turns auto-renew off (stays Pro until the period ends) or back on. */
export async function setAutoRenew(userId: string, on: boolean) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || (sub.status !== "active" && sub.status !== "past_due")) return false;
  if (on && !sub.paymentToken) return false;
  await db.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: !on } });
  return true;
}

/** The cycle used from the next renewal on (e.g. switch to yearly). */
export async function setNextCycle(userId: string, cycle: BillingCycle) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== "active") return false;
  await db.subscription.update({ where: { id: sub.id }, data: { cycle } });
  return true;
}

type JobReport = { renewed: number; failed: number; ended: number; trialsEnded: number };

/**
 * Scheduled billing job (runs hourly): renews due subscriptions with the saved
 * token, retries failed renewals (RENEWAL_RETRY_DAYS), ends cancelled or
 * unpaid ones, and closes ended trials. Each changed creator page is refreshed.
 */
export async function runBillingJob(now = new Date()): Promise<JobReport> {
  const report: JobReport = { renewed: 0, failed: 0, ended: 0, trialsEnded: 0 };
  const provider = paymentProvider();

  // Trials that ended without paying: Free (no data deleted).
  const trials = await db.subscription.findMany({ where: { status: "trialing", trialEndsAt: { lte: now } }, select: { id: true, userId: true } });
  for (const t of trials) {
    await db.subscription.update({ where: { id: t.id }, data: { status: "expired", plan: "free" } });
    await refreshPage(t.userId);
    await notify(t.userId, "trial_ended", {}, { dedupeKey: "trial_ended" });
    report.trialsEnded++;
  }

  // Auto-renew off and the period is over: Free.
  const cancelled = await db.subscription.findMany({ where: { status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: { lte: now } }, select: { id: true, userId: true } });
  for (const s of cancelled) {
    await db.subscription.update({ where: { id: s.id }, data: { status: "canceled", plan: "free" } });
    await refreshPage(s.userId);
    await notify(s.userId, "subscription_ended");
    report.ended++;
  }

  const due = await db.subscription.findMany({
    where: {
      OR: [
        { status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: { lte: now } },
        { status: "past_due", nextRetryAt: { lte: now } },
      ],
    },
  });
  for (const sub of due) {
    if (!provider || !sub.paymentToken || !sub.cycle || !sub.currency || !sub.currentPeriodEnd) {
      await db.subscription.update({ where: { id: sub.id }, data: { status: "expired", plan: "free" } });
      await refreshPage(sub.userId);
      await notify(sub.userId, "subscription_ended");
      report.ended++;
      continue;
    }
    const amount = PRICES[sub.currency][sub.cycle];
    const start = sub.currentPeriodEnd;
    const end = addCycle(start, sub.cycle);
    // Affiliate credit (creators who chose "credit") pays part or all of the renewal.
    const { credit, creditSar } = await renewalCredit(sub.userId, amount, sub.currency);
    const charge = Math.round((amount - credit) * 100) / 100;
    const invoice = await db.invoice.create({
      data: { userId: sub.userId, subscriptionId: sub.id, kind: "renewal", cycle: sub.cycle, currency: sub.currency, amount, vatAmount: vatPart(amount), creditAmount: credit, provider: provider.name, periodStart: start, periodEnd: end },
    });
    let payment: Payment;
    if (charge <= 0) {
      payment = { id: `credit_${invoice.id}`, status: "paid", amount: 0, currency: sub.currency, invoiceId: invoice.id };
    } else {
      try {
        payment = await provider.chargeToken({ token: sub.paymentToken, amount: charge, currency: sub.currency, description: `Wsool Pro renewal (${sub.cycle})`, invoiceId: invoice.id });
      } catch {
        payment = { id: `error_${invoice.id}`, status: "failed", amount: charge, currency: sub.currency, invoiceId: invoice.id, failureReason: "Provider error" };
      }
    }

    if (payment.status === "paid") {
      const number = await db.$transaction(async (tx) => {
        const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: "paid", number: Number(nextval), providerPaymentId: payment.id, paidAt: now } });
        await tx.subscription.update({ where: { id: sub.id }, data: { status: "active", currentPeriodEnd: end, failedAttempts: 0, nextRetryAt: null } });
        // The credit used is a payout of the creator's commission balance.
        if (creditSar > 0) {
          await tx.referralPayout.create({ data: { referrerId: sub.userId, method: "credit", amount: creditSar, invoiceId: invoice.id, note: invoiceLabel(Number(nextval)) } });
        }
        return Number(nextval);
      });
      report.renewed++;
      await notify(sub.userId, "renewal_receipt", { invoice: invoiceLabel(number), amount, currency: sub.currency, periodEndDate: end.toISOString() });
      if (creditSar > 0) await notify(sub.userId, "commission_credit", { amount: credit, currency: sub.currency, invoice: invoiceLabel(number) });
      await earnCommission(invoice.id);
    } else {
      const attempts = sub.failedAttempts + 1;
      const retryDay = RENEWAL_RETRY_DAYS[attempts - 1];
      await db.invoice.update({ where: { id: invoice.id }, data: { status: "failed", providerPaymentId: payment.id, failureReason: payment.failureReason?.slice(0, 200) } });
      await db.subscription.update({
        where: { id: sub.id },
        data: retryDay === undefined
          ? { status: "expired", plan: "free", failedAttempts: attempts, nextRetryAt: null }
          : { status: "past_due", failedAttempts: attempts, nextRetryAt: new Date(start.getTime() + retryDay * 86_400_000) },
      });
      if (retryDay === undefined) {
        await refreshPage(sub.userId);
        await notify(sub.userId, "subscription_ended");
        report.ended++;
      } else {
        await notify(sub.userId, "payment_failed", { amount, currency: sub.currency, retryDate: new Date(start.getTime() + retryDay * 86_400_000).toISOString() });
      }
      report.failed++;
    }
  }
  return report;
}

/** Refunds a paid invoice in full through its provider; the plan ends now. */
export async function refundInvoice(invoiceId: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  const provider = paymentProvider();
  if (!invoice || invoice.status !== "paid" || !invoice.providerPaymentId) return { ok: false, error: "not_refundable" };
  if (!provider || provider.name !== invoice.provider) return { ok: false, error: "provider" };
  // Only what the provider charged goes back; an affiliate credit used on it is restored to the balance.
  const charged = Math.round((Number(invoice.amount) - Number(invoice.creditAmount)) * 100) / 100;
  if (charged > 0) {
    const res = await provider.refund(invoice.providerPaymentId, charged);
    if (!res.ok) return { ok: false, error: "provider" };
  }
  // Pro ends now only when this invoice paid for the current (or a later) period, not for an old one.
  const sub = await db.subscription.findUnique({ where: { id: invoice.subscriptionId }, select: { currentPeriodEnd: true } });
  const current = !sub?.currentPeriodEnd || !invoice.periodEnd || invoice.periodEnd.getTime() >= sub.currentPeriodEnd.getTime();
  await db.$transaction([
    db.invoice.update({ where: { id: invoice.id }, data: { status: "refunded", refundedAt: new Date() } }),
    db.referralPayout.deleteMany({ where: { invoiceId: invoice.id, method: "credit" } }),
    ...(current ? [db.subscription.update({ where: { id: invoice.subscriptionId }, data: { status: "canceled", plan: "free", cancelAtPeriodEnd: true, currentPeriodEnd: new Date() } })] : []),
  ]);
  await cancelCommissionForRefund(invoice.id);
  await refreshPage(invoice.userId);
  await notify(invoice.userId, "refund_issued", { invoice: invoiceLabel(invoice.number), amount: charged, currency: invoice.currency });
  return { ok: true, userId: invoice.userId };
}
