import "server-only";
import type { Currency } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

/**
 * Finance numbers for the admin panel and investor links (CLAUDE.md section 9).
 * Everything is reported in SAR (USD at the fixed peg), revenue without VAT.
 */
export const USD_TO_SAR = 3.75;
const toSar = (amount: number, currency: Currency) => (currency === "USD" ? amount * USD_TO_SAR : amount);

/** "2026-10" keys for the last `count` months, oldest first. */
export function monthKeys(count: number, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}
const monthOf = (d: Date) => d.toISOString().slice(0, 7);
const monthStart = (key: string) => new Date(`${key}-01T00:00:00Z`);
const nextMonth = (key: string) => { const d = monthStart(key); d.setUTCMonth(d.getUTCMonth() + 1); return d; };

export type MonthRow = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  marketing: number;
  mrr: number;
  customers: number;
  newCustomers: number;
  churned: number;
};

/** Expense amount (SAR) falling in a month, expanding recurring expenses. */
function expenseInMonth(e: { date: Date; endDate: Date | null; amount: number; currency: Currency; recurrence: string }, key: string) {
  const start = monthStart(key), end = nextMonth(key);
  if (e.date >= end || (e.endDate && e.endDate < start)) return 0;
  const amount = toSar(e.amount, e.currency);
  if (e.recurrence === "none") return e.date >= start ? amount : 0;
  if (e.recurrence === "monthly") return amount;
  return e.date.getUTCMonth() === start.getUTCMonth() ? amount : 0; // yearly: its anniversary month
}

/** Monthly finance table for the last `months` months, plus unit economics. */
export async function financeReport(months: number) {
  const keys = monthKeys(months);
  const from = monthStart(keys[0]);
  // A yearly invoice paid up to a year before still adds MRR in the window.
  const invoices = await db.invoice.findMany({
    where: { status: "paid", OR: [{ paidAt: { gte: from } }, { periodEnd: { gt: from } }] },
    select: { userId: true, amount: true, vatAmount: true, currency: true, cycle: true, paidAt: true, periodStart: true, periodEnd: true },
  });
  const firstPaid = await db.invoice.groupBy({ by: ["userId"], where: { status: { in: ["paid", "refunded"] } }, _min: { paidAt: true } });
  const firstByUser = new Map(firstPaid.map((f) => [f.userId, f._min.paidAt]));
  const expenses = (await db.expense.findMany({ where: { date: { lt: nextMonth(keys[keys.length - 1]) } } })).map((e) => ({ ...e, amount: Number(e.amount) }));

  const rows: MonthRow[] = keys.map((key) => {
    const start = monthStart(key), end = nextMonth(key);
    let revenue = 0, mrr = 0;
    const paying = new Set<string>();
    for (const inv of invoices) {
      const net = toSar(Number(inv.amount) - Number(inv.vatAmount), inv.currency);
      if (inv.paidAt && monthOf(inv.paidAt) === key) revenue += net;
      // MRR: the invoice's monthly value while its paid period covers the month.
      if (inv.periodStart && inv.periodEnd && inv.periodStart < end && inv.periodEnd > start) {
        mrr += net / (inv.cycle === "yearly" ? 12 : 1);
        paying.add(inv.userId);
      }
    }
    const monthExpenses = expenses.reduce((s, e) => s + expenseInMonth(e, key), 0);
    const marketing = expenses.filter((e) => e.category === "marketing").reduce((s, e) => s + expenseInMonth(e, key), 0);
    const newCustomers = [...firstByUser.values()].filter((d) => d && monthOf(d) === key).length;
    return { month: key, revenue, expenses: monthExpenses, profit: revenue - monthExpenses, marketing, mrr, customers: paying.size, newCustomers, churned: 0, payingIds: paying } as MonthRow & { payingIds: Set<string> };
  });
  // Churned = paying last month, not this month.
  rows.forEach((r, i) => {
    if (i === 0) return;
    const prev = (rows[i - 1] as MonthRow & { payingIds: Set<string> }).payingIds;
    const cur = (r as MonthRow & { payingIds: Set<string> }).payingIds;
    r.churned = [...prev].filter((id) => !cur.has(id)).length;
  });
  const clean = rows.map((r) => {
    const { payingIds: _ids, ...rest } = r as MonthRow & { payingIds: Set<string> };
    void _ids;
    return rest;
  });

  const last = clean[clean.length - 1], prev = clean[clean.length - 2];
  const recent = clean.slice(-3);
  const churnRates = recent.map((r, i) => {
    const before = clean[clean.length - 3 + i - 1];
    return before && before.customers ? r.churned / before.customers : null;
  }).filter((x): x is number => x !== null);
  const churn = churnRates.length ? churnRates.reduce((a, b) => a + b, 0) / churnRates.length : null;
  const arpu = last.customers ? last.mrr / last.customers : null;
  const marketing3 = recent.reduce((s, r) => s + r.marketing, 0), new3 = recent.reduce((s, r) => s + r.newCustomers, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const sum = keys.reduce((s, key) => s + expenseInMonth(e, key), 0);
    if (sum) byCategory[e.category] = (byCategory[e.category] ?? 0) + sum;
  }

  return {
    months: clean,
    /** Expenses in the window per category (SAR), largest first. */
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    totals: {
      revenue: clean.reduce((s, r) => s + r.revenue, 0),
      expenses: clean.reduce((s, r) => s + r.expenses, 0),
      profit: clean.reduce((s, r) => s + r.profit, 0),
    },
    unit: {
      mrr: last.mrr,
      mrrGrowth: prev && prev.mrr ? (last.mrr - prev.mrr) / prev.mrr : null,
      customers: last.customers,
      arpu,
      /** Average monthly churn over the last 3 months. */
      churn,
      ltv: arpu !== null && churn ? arpu / churn : null,
      /** Marketing spend per new paying customer, last 3 months. */
      cac: new3 ? marketing3 / new3 : null,
    },
  };
}

export type FinanceReport = Awaited<ReturnType<typeof financeReport>>;

/** Platform growth for investor links: totals only, no personal data. */
export async function growthCounts() {
  const [users, published, verified] = await Promise.all([
    db.user.count(),
    db.page.count({ where: { isPublished: true, deletedAt: null } }),
    db.socialAccount.count({ where: { verificationStatus: "verified", verifiedUntil: { gt: new Date() } } }),
  ]);
  return { users, published, verified };
}
