import { NextResponse, type NextRequest } from "next/server";
import { settleCheckout } from "@/lib/billing";
import { paymentProvider } from "@/lib/payments";
import { db } from "@/lib/db";

/**
 * The provider sends the browser here after checkout. The payment is read
 * from the provider (never trusted from the URL), applied to its invoice, and
 * the creator lands on their subscription page with the result.
 */
export async function GET(req: NextRequest) {
  const invoiceId = req.nextUrl.searchParams.get("invoice") ?? "";
  // Moyasar/Tap send the payment id as "id" / "tap_id"; the test provider as "payment".
  const paymentId = req.nextUrl.searchParams.get("payment") ?? req.nextUrl.searchParams.get("id") ?? req.nextUrl.searchParams.get("tap_id") ?? "";
  const provider = paymentProvider();
  let result = "failed";
  if (provider && invoiceId && paymentId) {
    const payment = await provider.getPayment(paymentId).catch(() => null);
    if (payment) result = await settleCheckout(invoiceId, payment);
  }
  // Agency plan invoices go back to the agency's Subscription tab.
  const agency = /^[0-9a-f-]{36}$/.test(invoiceId) ? (await db.invoice.findUnique({ where: { id: invoiceId }, select: { agencyId: true } }))?.agencyId : null;
  const back = agency ? `/agency?tab=billing&payment=${result}` : `/dashboard/subscription?payment=${result}`;
  return NextResponse.redirect(new URL(back, req.nextUrl.origin), 303);
}
