import { FINANCE_PERIODS } from "@/config/finance";
import { audit, can, getAdmin } from "@/lib/admin";
import { invoiceLabel } from "@/lib/billing";
import { csvResponse } from "@/lib/csv";
import { USD_TO_SAR } from "@/lib/finance";
import { saudiMonth, vatInvoices } from "@/lib/vat";

/**
 * VAT report for the accountant (staff with revenue.view), ?months= like the Finance page: one row per invoice paid
 * or refunded in the period, with its SAR amounts and Saudi dates. No customer data. Each export is audited.
 */
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin || !can(admin, "revenue.view")) return new Response("Not found", { status: 404 });
  const raw = Number(new URL(req.url).searchParams.get("months"));
  const months = (FINANCE_PERIODS as readonly number[]).includes(raw) ? raw : 6;
  const now = new Date(Date.now() + 3 * 3_600_000);
  // First day of the first month, Saudi time.
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1) - 3 * 3_600_000);
  const rows = await vatInvoices(from);
  await audit(admin, "vat.export", undefined, { count: rows.length, months });
  const day = (d: Date | null) => (d ? new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10) : "");
  const sar = (v: number, c: string) => (c === "USD" ? v * USD_TO_SAR : v).toFixed(2);
  return csvResponse(
    "vat",
    "invoice,paid_date,paid_month,status,refunded_date,currency,total,net,vat,total_sar,net_sar,vat_sar",
    rows.map((r) => {
      const total = Number(r.amount), vat = Number(r.vatAmount);
      return [
        invoiceLabel(r.number), day(r.paidAt), r.paidAt ? saudiMonth(r.paidAt) : "", r.status, day(r.refundedAt), r.currency,
        total.toFixed(2), (total - vat).toFixed(2), vat.toFixed(2), sar(total, r.currency), sar(total - vat, r.currency), sar(vat, r.currency),
      ];
    }),
  );
}
