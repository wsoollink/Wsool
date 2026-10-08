"use server";

import { getAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentProvider } from "@/lib/payments";
import { mockPaymentId } from "@/lib/payments/mock";

/**
 * Test checkout result (staff only, test provider only). Returns the return
 * URL; the page then does a full browser redirect to it, like a real provider.
 */
export async function completeMockPayment(invoiceId: string, outcome: "paid" | "failed", card: "ok" | "fail"): Promise<{ url: string }> {
  const user = await requireUser();
  const back = { url: "/dashboard/subscription" };
  if (paymentProvider()?.name !== "mock" || !(await getAdmin())) return back;
  const invoice = await db.invoice.findFirst({ where: { id: String(invoiceId), userId: user.id, status: "pending" } });
  if (!invoice) return back;
  const id = mockPaymentId(invoice.id, outcome === "paid" ? "paid" : "failed", Number(invoice.amount), invoice.currency, card === "fail" ? "fail" : "ok");
  return { url: `/billing/return?invoice=${invoice.id}&payment=${encodeURIComponent(id)}` };
}
