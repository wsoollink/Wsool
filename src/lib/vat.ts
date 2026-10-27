import "server-only";
import type { Currency } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { monthKeys, USD_TO_SAR } from "@/lib/finance";

/**
 * VAT owed to ZATCA (owner, Oct 2026): every price includes 15% VAT and each invoice stores its VAT part.
 * Sales count in the month they were paid, refunds take their VAT back in the month they were refunded.
 * Months and quarters follow Saudi time; USD invoices are converted at the fixed peg.
 */
const SAUDI_OFFSET = 3 * 3_600_000;
const saudi = (d: Date) => new Date(d.getTime() + SAUDI_OFFSET);
const r2 = (v: number) => Math.round(v * 100) / 100;
const toSar = (v: number, c: Currency) => r2(c === "USD" ? v * USD_TO_SAR : v);

/** "2026-10" in Saudi time. */
export const saudiMonth = (d: Date) => saudi(d).toISOString().slice(0, 7);
/** "2026-Q4" for a "2026-10" month key. */
export const quarterOf = (month: string) => `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`;

export type VatRow = {
  /** "2026-10" or "2026-Q4". */
  key: string;
  /** Paid in the period, VAT included / without VAT / the VAT part (SAR). */
  sales: number;
  net: number;
  vat: number;
  invoices: number;
  /** Refunded in the period: the amount and its VAT, taken off what is owed. */
  refunds: number;
  refundVat: number;
  /** VAT owed for the period = vat - refundVat. */
  due: number;
};

const empty = (key: string): VatRow => ({ key, sales: 0, net: 0, vat: 0, invoices: 0, refunds: 0, refundVat: 0, due: 0 });

/** Paid (or later refunded) invoices with a payment or refund on or after `from`. */
export function vatInvoices(from: Date) {
  return db.invoice.findMany({
    where: { status: { in: ["paid", "refunded"] }, number: { not: null }, OR: [{ paidAt: { gte: from } }, { refundedAt: { gte: from } }] },
    orderBy: { paidAt: "asc" },
    select: { number: true, status: true, currency: true, amount: true, vatAmount: true, paidAt: true, refundedAt: true },
  });
}

/** Monthly rows for the last `months` months, the last 4 quarters, and the current quarter. */
export async function vatReport(months: number, now = new Date()) {
  const monthList = monthKeys(months, saudi(now));
  const thisQuarter = quarterOf(saudiMonth(now));
  // Last 4 quarters, oldest first: the first month of each, stepping back 3 months from this quarter's.
  const year = Number(thisQuarter.slice(0, 4)), q = Number(thisQuarter.slice(-1));
  const quarterStarts = [3, 2, 1, 0].map((back) => {
    const d = new Date(Date.UTC(year, (q - 1) * 3 - back * 3, 1));
    return d.toISOString().slice(0, 7);
  });
  const quarterList = quarterStarts.map(quarterOf);
  const firstMonth = [monthList[0], quarterStarts[0]].sort()[0];
  // Start of that month in Saudi time.
  const from = new Date(new Date(`${firstMonth}-01T00:00:00Z`).getTime() - SAUDI_OFFSET);

  const byMonth = new Map(monthList.map((k) => [k, empty(k)]));
  const byQuarter = new Map(quarterList.map((k) => [k, empty(k)]));
  for (const inv of await vatInvoices(from)) {
    const total = toSar(Number(inv.amount), inv.currency), vat = toSar(Number(inv.vatAmount), inv.currency);
    if (inv.paidAt && inv.paidAt >= from) {
      const m = saudiMonth(inv.paidAt);
      for (const row of [byMonth.get(m), byQuarter.get(quarterOf(m))]) {
        if (!row) continue;
        row.sales += total; row.vat += vat; row.net += total - vat; row.invoices++;
      }
    }
    if (inv.status === "refunded" && inv.refundedAt && inv.refundedAt >= from) {
      const m = saudiMonth(inv.refundedAt);
      for (const row of [byMonth.get(m), byQuarter.get(quarterOf(m))]) {
        if (!row) continue;
        row.refunds += total; row.refundVat += vat;
      }
    }
  }
  const finish = (row: VatRow): VatRow => ({
    ...row, sales: r2(row.sales), net: r2(row.net), vat: r2(row.vat), refunds: r2(row.refunds), refundVat: r2(row.refundVat), due: r2(row.vat - row.refundVat),
  });
  const quarters = [...byQuarter.values()].map(finish);
  return { months: [...byMonth.values()].map(finish), quarters, current: quarters.find((q) => q.key === thisQuarter)! };
}

export type VatReport = Awaited<ReturnType<typeof vatReport>>;

/**
 * ZATCA phase 1 QR code payload for a simplified tax invoice: TLV (tag, length, UTF-8 value) of seller name,
 * VAT number, time stamp, total with VAT and the VAT amount (SAR), then base64. Only valid once the VAT number is set.
 */
export function zatcaQrPayload(fields: { seller: string; vatNumber: string; time: Date; total: number; vat: number }) {
  const values = [fields.seller, fields.vatNumber, fields.time.toISOString().replace(/\.\d{3}Z$/, "Z"), fields.total.toFixed(2), fields.vat.toFixed(2)];
  const parts = values.map((v, i) => {
    const bytes = Buffer.from(v, "utf8");
    return Buffer.concat([Buffer.from([i + 1, bytes.length]), bytes]);
  });
  return Buffer.concat(parts).toString("base64");
}
