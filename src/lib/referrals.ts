import "server-only";
import { hasPro } from "@/config/plans";
import { REFERRAL, REF_PARAM } from "@/config/referrals";
import type { Currency } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { isBot, today, visitorHash } from "@/lib/analytics";
import { db } from "@/lib/db";
import { USD_TO_SAR } from "@/lib/finance";
import { notify } from "@/lib/notify";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { siteOrigin } from "@/lib/site-url";

/**
 * Affiliate program logic (REFERRAL in src/config/referrals.ts). Amounts are
 * SAR. A commission is earned on each paid invoice of a referred customer in
 * their first REFERRAL.months, while the referrer is Pro, and becomes payable
 * after REFERRAL.holdDays. Balance = payable commissions - payouts (bank
 * transfers recorded by staff, or credit used on the referrer's renewals).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Calendar months later (Jan 31 + 1 = Feb 28/29), like addCycle. */
function addMonths(from: Date, months: number) {
  const y = from.getUTCFullYear(), m = from.getUTCMonth() + months;
  const d = new Date(from);
  d.setUTCFullYear(y, m, Math.min(from.getUTCDate(), new Date(Date.UTC(y, m + 1, 0)).getUTCDate()));
  return d;
}
const toSar = (amount: number, currency: Currency) => (currency === "USD" ? amount * USD_TO_SAR : amount);

export const referralLink = (username: string) => `${siteOrigin()}/?${REF_PARAM}=${username}`;

/** "gmail" dots and "+tags" ignored, so a second account on the same inbox doesn't count. */
export function sameInbox(a: string, b: string) {
  const norm = (e: string) => {
    const [local = "", domain = ""] = e.toLowerCase().trim().split("@");
    let l = local.split("+")[0];
    if (domain === "gmail.com" || domain === "googlemail.com") l = l.replace(/\./g, "");
    return `${l}@${domain === "googlemail.com" ? "gmail.com" : domain}`;
  };
  return norm(a) === norm(b);
}

/** The creator behind a referral link, if they can take part (Pro, page live, not suspended). */
export async function eligibleReferrer(username: string): Promise<string | null> {
  const name = username.toLowerCase();
  if (!/^[a-z0-9._]{3,20}$/.test(name)) return null;
  let page = await db.page.findUnique({ where: { username: name }, select: { userId: true, deletedAt: true } });
  if (!page) {
    // An old username still redirecting (USERNAME_REDIRECT_DAYS) keeps its links working.
    const old = await db.usernameRedirect.findFirst({ where: { name, releasedAt: { gt: new Date() } }, select: { page: { select: { userId: true, deletedAt: true } } } });
    page = old?.page ?? null;
  }
  if (!page || page.deletedAt) return null;
  const user = await db.user.findUnique({ where: { id: page.userId }, select: { suspendedAt: true, subscription: { select: { status: true, trialEndsAt: true } } } });
  if (!user || user.suspendedAt || !hasPro(user.subscription)) return null;
  return page.userId;
}

/** Counts one click on a referral link (unique per visitor and day; bots and floods ignored). */
export async function recordReferralClick(referrerId: string, headers: Headers) {
  const ua = headers.get("user-agent") ?? "";
  if (isBot(ua)) return;
  const ip = ipFrom(headers);
  if (!(await rateLimit(`refclick:${ip}`, 30, 86400))) return;
  const day = today();
  await db.referralClick.createMany({
    data: [{ referrerId, day, visitorHash: visitorHash(ip, ua, `ref:${referrerId}`, day) }],
    skipDuplicates: true,
  });
}

/** Cookie value for a click now. */
export const refCookieValue = (referrerId: string) => `${referrerId}.${Date.now()}`;

/**
 * Ties a brand-new account to the creator whose link it came from (cookie set
 * by /api/ref within REFERRAL.cookieDays). Never the account itself or the
 * same inbox. Only called when the account is created.
 */
export async function attachReferral(tx: Prisma.TransactionClient, user: { id: string; email: string }, cookie: string | undefined) {
  const m = cookie?.match(/^([0-9a-f-]{36})\.(\d{10,15})$/);
  if (!m) return;
  const [, referrerId, at] = m;
  if (referrerId === user.id || Date.now() - Number(at) > REFERRAL.cookieDays * 86_400_000) return;
  const referrer = await tx.user.findUnique({ where: { id: referrerId }, select: { email: true } });
  if (!referrer || sameInbox(referrer.email, user.email)) return;
  await tx.user.update({ where: { id: user.id }, data: { referredById: referrerId, referredAt: new Date() } });
}

/**
 * Adds the commission for a paid invoice of a referred customer (idempotent:
 * one per invoice). Skipped when the referrer isn't Pro or suspended, or the
 * payment is past the customer's first REFERRAL.months.
 */
export async function earnCommission(invoiceId: string) {
  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.status !== "paid" || !invoice.paidAt) return;
    const customer = await db.user.findUnique({ where: { id: invoice.userId }, select: { referredById: true } });
    if (!customer?.referredById) return;
    const referrer = await db.user.findUnique({
      where: { id: customer.referredById },
      select: { suspendedAt: true, subscription: { select: { status: true, trialEndsAt: true } } },
    });
    if (!referrer || referrer.suspendedAt || !hasPro(referrer.subscription)) return;

    const first = await db.invoice.findFirst({ where: { userId: invoice.userId, status: { in: ["paid", "refunded"] }, paidAt: { not: null } }, orderBy: { paidAt: "asc" }, select: { paidAt: true } });
    // Payments before the first payment + REFERRAL.months (12 = a yearly plan earns once, monthly 12 times).
    if (invoice.paidAt >= addMonths(first?.paidAt ?? invoice.paidAt, REFERRAL.months)) return;

    const base = round2(toSar(Number(invoice.amount) - Number(invoice.vatAmount), invoice.currency));
    const amount = round2((base * REFERRAL.percent) / 100);
    if (amount <= 0) return;
    const availableAt = new Date(invoice.paidAt.getTime() + REFERRAL.holdDays * 86_400_000);
    try {
      await db.referralCommission.create({
        data: { referrerId: customer.referredById, referredUserId: invoice.userId, invoiceId: invoice.id, baseAmount: base, percent: REFERRAL.percent, amount, availableAt },
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return; // already earned (return page + webhook)
      throw err;
    }
    await notify(customer.referredById, "commission_earned", { amount, currency: "SAR", availableDate: availableAt.toISOString() });
  } catch (err) {
    console.error("[referrals] earnCommission failed", invoiceId, err);
  }
}

/** A refund within the hold period cancels that invoice's commission. */
export async function cancelCommissionForRefund(invoiceId: string) {
  await db.referralCommission.updateMany({ where: { invoiceId, cancelledAt: null, availableAt: { gt: new Date() } }, data: { cancelledAt: new Date() } });
}

export type Balance = { pending: number; available: number; paidOut: number; earned: number };

/** One creator's commission totals (SAR). `available` = payable now. */
export async function referralBalance(userId: string, db_: Prisma.TransactionClient = db): Promise<Balance> {
  const now = new Date();
  const [pending, ready, paid] = await Promise.all([
    db_.referralCommission.aggregate({ where: { referrerId: userId, cancelledAt: null, availableAt: { gt: now } }, _sum: { amount: true } }),
    db_.referralCommission.aggregate({ where: { referrerId: userId, cancelledAt: null, availableAt: { lte: now } }, _sum: { amount: true } }),
    db_.referralPayout.aggregate({ where: { referrerId: userId }, _sum: { amount: true } }),
  ]);
  const p = Number(pending._sum.amount ?? 0), r = Number(ready._sum.amount ?? 0), out = Number(paid._sum.amount ?? 0);
  return { pending: round2(p), available: round2(Math.max(0, r - out)), paidOut: round2(out), earned: round2(p + r) };
}

/**
 * Credit for a renewal (in the invoice currency) when the creator chose
 * "credit": up to the payable balance and the price. A remaining charge under
 * 1 is never left (payment providers refuse tiny amounts).
 */
export async function renewalCredit(userId: string, price: number, currency: Currency): Promise<{ credit: number; creditSar: number }> {
  const none = { credit: 0, creditSar: 0 };
  const account = await db.referralAccount.findUnique({ where: { userId }, select: { payoutMethod: true } });
  if (account?.payoutMethod !== "credit") return none;
  const { available } = await referralBalance(userId);
  if (available <= 0) return none;
  let credit = round2(Math.min(price, currency === "USD" ? available / USD_TO_SAR : available));
  if (price - credit > 0 && price - credit < 1) credit = round2(Math.max(0, price - 1));
  if (credit <= 0) return none;
  return { credit, creditSar: round2(toSar(credit, currency)) };
}

/** "SA•• •••• •••• 1234" for the creator's own view. */
export const maskIban = (iban: string | null) => (iban ? `${iban.slice(0, 2)}•• •••• ${iban.slice(-4)}` : null);

export type ReferrerRow = Balance & {
  userId: string; username: string | null; email: string; signups: number;
  method: "credit" | "bank"; iban: string | null; holderName: string | null;
};

/** Every creator with referred sign-ups, commissions or payouts, for staff (admin Commissions page + CSV). */
export async function referrerRows(): Promise<ReferrerRow[]> {
  const now = new Date();
  const [signups, pending, ready, paid] = await Promise.all([
    db.user.groupBy({ by: ["referredById"], where: { referredById: { not: null } }, _count: { _all: true } }),
    db.referralCommission.groupBy({ by: ["referrerId"], where: { cancelledAt: null, availableAt: { gt: now } }, _sum: { amount: true } }),
    db.referralCommission.groupBy({ by: ["referrerId"], where: { cancelledAt: null, availableAt: { lte: now } }, _sum: { amount: true } }),
    db.referralPayout.groupBy({ by: ["referrerId"], _sum: { amount: true } }),
  ]);
  const sum = (rows: { _sum: { amount: unknown } }[], key: (r: never) => string | null) => new Map(rows.map((r) => [key(r as never), Number(r._sum.amount ?? 0)]));
  const pendingBy = sum(pending, (r: { referrerId: string }) => r.referrerId);
  const readyBy = sum(ready, (r: { referrerId: string }) => r.referrerId);
  const paidBy = sum(paid, (r: { referrerId: string }) => r.referrerId);
  const signupsBy = new Map(signups.map((r) => [r.referredById, r._count._all]));
  const ids = [...new Set([...signupsBy.keys(), ...pendingBy.keys(), ...readyBy.keys(), ...paidBy.keys()].filter((x): x is string => !!x))];
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, page: { select: { username: true } }, referralAccount: true },
  });
  return users
    .map((u) => {
      const p = pendingBy.get(u.id) ?? 0, r = readyBy.get(u.id) ?? 0, out = paidBy.get(u.id) ?? 0;
      return {
        userId: u.id, username: u.page?.username ?? null, email: u.email, signups: signupsBy.get(u.id) ?? 0,
        method: u.referralAccount?.payoutMethod ?? "credit", iban: u.referralAccount?.iban ?? null, holderName: u.referralAccount?.holderName ?? null,
        pending: round2(p), available: round2(Math.max(0, r - out)), paidOut: round2(out), earned: round2(p + r),
      };
    })
    .sort((a, b) => b.available - a.available || b.earned - a.earned || b.signups - a.signups);
}
