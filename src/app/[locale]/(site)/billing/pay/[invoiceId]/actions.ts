"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Moyasar's form calls this (on_completed) right after it creates the payment, before any 3-D Secure
 * redirect, so the invoice knows its payment id even if the customer never comes back. Nothing is
 * settled here: /billing/return and the webhook read the payment from Moyasar first.
 */
export async function rememberPayment(invoiceId: string, paymentId: string): Promise<void> {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/.test(String(invoiceId)) || !/^[A-Za-z0-9_-]{1,64}$/.test(String(paymentId))) return;
  await db.invoice.updateMany({ where: { id: invoiceId, userId: user.id, status: "pending" }, data: { providerPaymentId: paymentId } });
}
