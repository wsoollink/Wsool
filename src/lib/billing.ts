import "server-only";
import { addCycle, PRICES, RENEWAL_RETRY_DAYS, vatPart } from "@/config/plans";
import type { BillingCycle, Currency } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { paymentProvider, type Payment } from "@/lib/payments";
import { expirePage } from "@/lib/public-page";
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

export type CheckoutError = "disabled" | "already_active" | "failed";

/**
 * Starts a Pro checkout for the signed-in user: creates a pending invoice and
 * returns the payment page URL. Prices come from config, never the browser.
 */
export async function startCheckout(user: { id: string; email: string }, cycle: BillingCycle, currency: Currency): Promise<{ url: string } | { error: CheckoutError }> {
  const provider = paymentProvider();
  if (!provider) return { error: "disabled" };
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (!sub) return { error: "failed" };
  if (sub.status === "active" && !sub.cancelAtPeriodEnd) return { error: "already_active" };

  const amount = PRICES[currency][cycle];
  const invoice = await db.invoice.create({
    data: {
      userId: user.id, subscriptionId: sub.id, kind: "checkout", cycle, currency,
      amount, vatAmount: vatPart(amount), provider: provider.name,
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
  if (done) await refreshPage(invoice.userId);
  // TODO(phase 6): receipt email with the invoice link.
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
    report.trialsEnded++;
  }

  // Auto-renew off and the period is over: Free.
  const cancelled = await db.subscription.findMany({ where: { status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: { lte: now } }, select: { id: true, userId: true } });
  for (const s of cancelled) {
    await db.subscription.update({ where: { id: s.id }, data: { status: "canceled", plan: "free" } });
    await refreshPage(s.userId);
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
      report.ended++;
      continue;
    }
    const amount = PRICES[sub.currency][sub.cycle];
    const start = sub.currentPeriodEnd;
    const end = addCycle(start, sub.cycle);
    const invoice = await db.invoice.create({
      data: { userId: sub.userId, subscriptionId: sub.id, kind: "renewal", cycle: sub.cycle, currency: sub.currency, amount, vatAmount: vatPart(amount), provider: provider.name, periodStart: start, periodEnd: end },
    });
    let payment: Payment;
    try {
      payment = await provider.chargeToken({ token: sub.paymentToken, amount, currency: sub.currency, description: `Wsool Pro renewal (${sub.cycle})`, invoiceId: invoice.id });
    } catch {
      payment = { id: `error_${invoice.id}`, status: "failed", amount, currency: sub.currency, invoiceId: invoice.id, failureReason: "Provider error" };
    }

    if (payment.status === "paid") {
      await db.$transaction(async (tx) => {
        const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: "paid", number: Number(nextval), providerPaymentId: payment.id, paidAt: now } });
        await tx.subscription.update({ where: { id: sub.id }, data: { status: "active", currentPeriodEnd: end, failedAttempts: 0, nextRetryAt: null } });
      });
      report.renewed++;
      // TODO(phase 6): renewal receipt email.
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
        report.ended++;
      }
      report.failed++;
      // TODO(phase 6): payment failed email (update card).
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
  const res = await provider.refund(invoice.providerPaymentId, Number(invoice.amount));
  if (!res.ok) return { ok: false, error: "provider" };
  await db.$transaction([
    db.invoice.update({ where: { id: invoice.id }, data: { status: "refunded", refundedAt: new Date() } }),
    db.subscription.update({ where: { id: invoice.subscriptionId }, data: { status: "canceled", plan: "free", cancelAtPeriodEnd: true, currentPeriodEnd: new Date() } }),
  ]);
  await refreshPage(invoice.userId);
  return { ok: true, userId: invoice.userId };
}
