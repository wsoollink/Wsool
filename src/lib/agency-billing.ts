import "server-only";
import { AGENCY_PRICES, AGENCY_UNLINK_AFTER_DAYS, agencyUnlinkDate, isAgencyPaidPlan, type AgencyPaidPlan } from "@/config/agency-plans";
import { addCycle, RENEWAL_RETRY_DAYS, vatPart } from "@/config/plans";
import type { BillingCycle, Currency } from "@/generated/prisma/enums";
import type { Invoice } from "@/generated/prisma/client";
import { agencyManagers, endLink } from "@/lib/agency";
import { refreshAgencyPage } from "@/lib/agency-page";
import { invoiceLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { notify, type NotificationType } from "@/lib/notify";
import { paymentProvider, type Payment } from "@/lib/payments";
import { siteOrigin } from "@/lib/site-url";

/**
 * Agency plans paid online (owner, Nov 2026), through the same provider, invoices table and invoice numbers as
 * creators' Pro (an invoice carries `agency_id` + `agency_plan` instead of a subscription). The paid period starts after
 * any trial or paid time left; renewals use the saved card with the same retries as creators; when the plan (or trial)
 * ends without renewal, linked creators stay AGENCY_UNLINK_AFTER_DAYS, then the links end (creators keep 14 days of Pro).
 */
const tell = async (agencyId: string, type: NotificationType, data: Record<string, string | number | null> = {}, dedupeKey?: string) => {
  for (const id of await agencyManagers(agencyId)) await notify(id, type, data, dedupeKey ? { dedupeKey } : {});
};

/** Where a new paid period starts: after any trial or paid time that's left. */
const periodStart = (until: Date | null, now: Date) => (until && until > now ? until : now);

export type AgencyCheckoutError = "disabled" | "already_active" | "downgrade" | "not_agency" | "failed";

/** Starts a plan checkout for an agency (owner/manager): a pending invoice + the payment page URL. Prices from config only. */
export async function startAgencyCheckout(payer: { id: string; email: string }, agencyId: string, plan: AgencyPaidPlan, cycle: BillingCycle, currency: Currency): Promise<{ url: string } | { error: AgencyCheckoutError }> {
  const provider = paymentProvider();
  if (!provider) return { error: "disabled" };
  const agency = await db.agency.findUnique({ where: { id: agencyId } });
  if (!agency || agency.status !== "active" || agency.kind !== "agency") return { error: "not_agency" };
  const now = new Date();
  const paidAndRunning = isAgencyPaidPlan(agency.plan) && !!agency.planUntil && agency.planUntil > now;
  if (paidAndRunning && agency.planAutoRenew && agency.plan === plan) return { error: "already_active" };
  // Moving down while the bigger plan is still paid: change it for the next renewal instead.
  if (paidAndRunning && agency.plan === "growth" && plan === "starter") return { error: "downgrade" };
  const amount = AGENCY_PRICES[currency][plan][cycle];
  const invoice = await db.invoice.create({
    data: { userId: payer.id, agencyId, agencyPlan: plan, kind: "checkout", cycle, currency, amount, vatAmount: vatPart(amount), provider: provider.name },
  });
  try {
    const { url } = await provider.startCheckout({
      invoiceId: invoice.id, amount, currency, customerEmail: payer.email,
      description: `Wsool agency plan ${plan} (${cycle})`,
      returnUrl: `${siteOrigin()}/billing/return?invoice=${invoice.id}`,
    });
    return { url };
  } catch {
    await db.invoice.update({ where: { id: invoice.id }, data: { status: "failed", failureReason: "Could not start checkout" } });
    return { error: "failed" };
  }
}

/** settleCheckout() for an agency invoice (already checked against the payment): plan, period, saved card. */
export async function settleAgencyInvoice(invoice: Invoice, payment: Payment): Promise<"paid"> {
  if (!invoice.agencyId || !invoice.agencyPlan) throw new Error("not an agency invoice");
  const agency = await db.agency.findUniqueOrThrow({ where: { id: invoice.agencyId } });
  const now = new Date();
  const start = periodStart(agency.planUntil, now);
  const end = addCycle(start, invoice.cycle);
  const done = await db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
    const { count } = await tx.invoice.updateMany({
      where: { id: invoice.id, status: { in: ["pending", "failed"] } },
      data: { status: "paid", number: Number(nextval), providerPaymentId: payment.id, paidAt: now, periodStart: start, periodEnd: end, failureReason: null },
    });
    if (count !== 1) return null;
    await tx.agency.update({
      where: { id: agency.id },
      data: {
        plan: invoice.agencyPlan!, planCycle: invoice.cycle, planCurrency: invoice.currency, planUntil: end,
        planAutoRenew: true, planFailedAttempts: 0, planRetryAt: null,
        ...(payment.token && { paymentToken: payment.token, paymentMethodLabel: payment.methodLabel?.slice(0, 60) ?? null }),
      },
    });
    return Number(nextval);
  });
  if (done !== null) {
    refreshAgencyPage(agency.slug);
    await tell(agency.id, "agency_payment_receipt", { invoice: invoiceLabel(done), amount: Number(invoice.amount), currency: invoice.currency, periodEndDate: end.toISOString() });
  }
  return "paid";
}

/** Auto-renew on (needs a saved card) or off (the plan runs to its end date). */
export async function setAgencyAutoRenew(agencyId: string, on: boolean) {
  const a = await db.agency.findUnique({ where: { id: agencyId } });
  if (!a || !isAgencyPaidPlan(a.plan) || (on && !a.paymentToken)) return false;
  await db.agency.update({ where: { id: a.id }, data: { planAutoRenew: on } });
  return true;
}

/** The plan and cycle charged from the next renewal on (e.g. move to the smaller plan or to yearly). */
export async function setAgencyNextPlan(agencyId: string, plan: AgencyPaidPlan, cycle: BillingCycle) {
  const a = await db.agency.findUnique({ where: { id: agencyId } });
  if (!a || !isAgencyPaidPlan(a.plan) || !a.planAutoRenew) return false;
  await db.agency.update({ where: { id: a.id }, data: { plan, planCycle: cycle } });
  return true;
}

/** Refund (staff, admin Subscriptions): money back through the provider; the plan ends now when this invoice paid for the current period. */
export async function refundAgencyInvoice(invoice: Invoice): Promise<{ ok: boolean; error?: string }> {
  const provider = paymentProvider();
  if (invoice.status !== "paid" || !invoice.providerPaymentId) return { ok: false, error: "not_refundable" };
  if (!provider || provider.name !== invoice.provider) return { ok: false, error: "provider" };
  const res = await provider.refund(invoice.providerPaymentId, Number(invoice.amount));
  if (!res.ok) return { ok: false, error: "provider" };
  const agency = invoice.agencyId ? await db.agency.findUnique({ where: { id: invoice.agencyId } }) : null;
  const current = !!agency && (!agency.planUntil || !invoice.periodEnd || invoice.periodEnd.getTime() >= agency.planUntil.getTime());
  await db.$transaction([
    db.invoice.update({ where: { id: invoice.id }, data: { status: "refunded", refundedAt: new Date() } }),
    ...(current && agency ? [db.agency.update({ where: { id: agency.id }, data: { planUntil: new Date(), planAutoRenew: false } })] : []),
  ]);
  if (agency) await tell(agency.id, "agency_refund_issued", { invoice: invoiceLabel(invoice.number), amount: Number(invoice.amount), currency: invoice.currency });
  return { ok: true };
}

type AgencyJobReport = { agencyRenewed: number; agencyFailed: number; agencyExpired: number; agencyUnlinked: number };

/**
 * Hourly (billing cron): renews due agency plans with the saved card (retries like creators), tells the team when a
 * plan or trial ended (once, with the unlink date), and ends the creator links AGENCY_UNLINK_AFTER_DAYS after the end.
 */
export async function runAgencyBillingJob(now = new Date()): Promise<AgencyJobReport> {
  const report: AgencyJobReport = { agencyRenewed: 0, agencyFailed: 0, agencyExpired: 0, agencyUnlinked: 0 };
  const provider = paymentProvider();

  const due = await db.agency.findMany({
    where: {
      status: "active", planAutoRenew: true, plan: { in: ["starter", "growth"] }, planUntil: { lte: now },
      OR: [{ planRetryAt: null }, { planRetryAt: { lte: now } }],
    },
  });
  for (const a of due) {
    const plan = a.plan as AgencyPaidPlan;
    if (!provider || !a.paymentToken || !a.planCycle || !a.planCurrency || !a.planUntil) {
      await db.agency.update({ where: { id: a.id }, data: { planAutoRenew: false, planRetryAt: null } });
      continue; // ends like a cancelled plan: the "expired" notice below goes out
    }
    const amount = AGENCY_PRICES[a.planCurrency][plan][a.planCycle];
    const start = a.planUntil;
    const end = addCycle(start, a.planCycle);
    const invoice = await db.invoice.create({
      data: {
        userId: (await agencyManagers(a.id))[0] ?? a.createdBy, agencyId: a.id, agencyPlan: plan, kind: "renewal", cycle: a.planCycle,
        currency: a.planCurrency, amount, vatAmount: vatPart(amount), provider: provider.name, periodStart: start, periodEnd: end,
      },
    });
    let payment: Payment;
    try {
      payment = await provider.chargeToken({ token: a.paymentToken, amount, currency: a.planCurrency, description: `Wsool agency plan ${plan} renewal (${a.planCycle})`, invoiceId: invoice.id });
    } catch {
      payment = { id: `error_${invoice.id}`, status: "failed", amount, currency: a.planCurrency, invoiceId: invoice.id, failureReason: "Provider error" };
    }
    if (payment.status === "paid") {
      const number = await db.$transaction(async (tx) => {
        const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: "paid", number: Number(nextval), providerPaymentId: payment.id, paidAt: now } });
        await tx.agency.update({ where: { id: a.id }, data: { planUntil: end, planFailedAttempts: 0, planRetryAt: null } });
        return Number(nextval);
      });
      report.agencyRenewed++;
      await tell(a.id, "agency_renewal_receipt", { invoice: invoiceLabel(number), amount, currency: a.planCurrency, periodEndDate: end.toISOString() });
    } else {
      const attempts = a.planFailedAttempts + 1;
      const retryDay = RENEWAL_RETRY_DAYS[attempts - 1];
      await db.invoice.update({ where: { id: invoice.id }, data: { status: "failed", providerPaymentId: payment.id, failureReason: payment.failureReason?.slice(0, 200) } });
      await db.agency.update({
        where: { id: a.id },
        data: retryDay === undefined
          ? { planAutoRenew: false, planFailedAttempts: attempts, planRetryAt: null }
          : { planFailedAttempts: attempts, planRetryAt: new Date(start.getTime() + retryDay * 86_400_000) },
      });
      if (retryDay !== undefined) await tell(a.id, "agency_payment_failed", { amount, currency: a.planCurrency, retryDate: new Date(start.getTime() + retryDay * 86_400_000).toISOString() });
      report.agencyFailed++;
    }
  }

  // Ended (trial or plan) and not renewing: tell the team once, with the date the creators will be unlinked.
  const ended = await db.agency.findMany({
    where: { status: "active", kind: "agency", planUntil: { lte: now, gt: new Date(now.getTime() - AGENCY_UNLINK_AFTER_DAYS * 86_400_000) }, planAutoRenew: false },
    select: { id: true, planUntil: true },
  });
  for (const a of ended) {
    await tell(a.id, "agency_plan_expired", { unlinkDate: agencyUnlinkDate(a.planUntil)!.toISOString(), days: AGENCY_UNLINK_AFTER_DAYS }, `agency_expired:${a.id}:${a.planUntil!.toISOString().slice(0, 10)}`);
    report.agencyExpired++;
  }

  // AGENCY_UNLINK_AFTER_DAYS later: the links end (each creator keeps 14 days of Pro and is told), open invites are cancelled.
  const overdue = await db.agency.findMany({
    where: {
      status: "active", planUntil: { lte: new Date(now.getTime() - AGENCY_UNLINK_AFTER_DAYS * 86_400_000) }, planAutoRenew: false,
      links: { some: { status: { in: ["active", "pending"] } } },
    },
    select: { id: true, slug: true, links: { where: { status: "active" }, select: { id: true } } },
  });
  for (const a of overdue) {
    for (const l of a.links) if (await endLink(l.id, "agency", { agencyId: a.id })) report.agencyUnlinked++;
    await db.agencyLink.updateMany({ where: { agencyId: a.id, status: "pending" }, data: { status: "cancelled" } });
    refreshAgencyPage(a.slug);
    if (a.links.length) await tell(a.id, "agency_links_ended", { count: a.links.length, days: AGENCY_UNLINK_AFTER_DAYS });
  }
  return report;
}
