import { audit, can, getAdmin } from "@/lib/admin";
import { invoiceLabel } from "@/lib/billing";
import { csvResponse } from "@/lib/csv";
import { db } from "@/lib/db";

/** CSV of invoices (staff with revenue.view): no emails or card details. Each export is in the audit log. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin || !can(admin, "revenue.view")) return new Response("Not found", { status: 404 });
  const rows = await db.invoice.findMany({
    where: { status: { in: ["paid", "refunded", "failed"] } },
    orderBy: { createdAt: "asc" },
    select: { number: true, kind: true, status: true, cycle: true, currency: true, amount: true, vatAmount: true, paidAt: true, refundedAt: true, createdAt: true, subscription: { select: { user: { select: { page: { select: { username: true } } } } } } },
  });
  await audit(admin, "invoice.export", undefined, { count: rows.length });
  return csvResponse(
    "invoices",
    "invoice,username,kind,status,cycle,currency,amount,vat,paid_at,refunded_at,created_at",
    rows.map((r) => [
      r.number ? invoiceLabel(r.number) : "", r.subscription.user.page?.username ?? "", r.kind, r.status, r.cycle, r.currency,
      r.amount.toFixed(2), r.vatAmount.toFixed(2), r.paidAt?.toISOString() ?? "", r.refundedAt?.toISOString() ?? "", r.createdAt.toISOString(),
    ]),
  );
}
