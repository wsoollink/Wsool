import { settleCheckout } from "@/lib/billing";
import { paymentProvider } from "@/lib/payments";

/**
 * Provider webhook: confirms checkouts even if the customer closed the browser
 * before returning. The provider verifies the request; the payment is then
 * read back from the provider before anything changes.
 */
export async function POST(req: Request) {
  const provider = paymentProvider();
  if (!provider) return new Response("Payments are off", { status: 404 });
  const event = await provider.parseWebhook(req);
  if (!event) return new Response("Bad request", { status: 400 });
  const payment = await provider.getPayment(event.paymentId);
  if (payment?.invoiceId) await settleCheckout(payment.invoiceId, payment);
  return new Response("ok");
}
