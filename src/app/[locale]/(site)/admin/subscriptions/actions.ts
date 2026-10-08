"use server";

import { audit, requireAdmin } from "@/lib/admin";
import { refundInvoice } from "@/lib/billing";

/** Full refund of a paid invoice through the provider; the creator's Pro ends now. */
export async function refund(invoiceId: string) {
  const admin = await requireAdmin("refunds");
  const res = await refundInvoice(String(invoiceId));
  if (res.ok) await audit(admin, "invoice.refund", { type: "user", id: res.userId! }, { invoiceId });
  return res;
}
