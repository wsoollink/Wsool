import type { Currency } from "@/generated/prisma/enums";

/**
 * Payment provider interface (CLAUDE.md section 2). The provider (Moyasar or
 * Tap) isn't final, so the app only talks to this interface. Amounts are in
 * major units (49.00 SAR), VAT included.
 */
export type PaymentStatus = "paid" | "failed" | "pending";

export type Payment = {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  /** Our invoice id, as stored in the provider's metadata. */
  invoiceId: string | null;
  /** Saved card/token for renewals, when the customer agreed to save it. */
  token?: string;
  /** Short label, e.g. "mada •••• 4242". */
  methodLabel?: string;
  failureReason?: string;
};

export type CheckoutRequest = {
  invoiceId: string;
  amount: number;
  currency: Currency;
  description: string;
  customerEmail: string;
  /** Where the provider sends the browser back (with the payment id). */
  returnUrl: string;
};

export interface PaymentProvider {
  readonly name: string;
  /** Test providers are usable by staff only. */
  readonly testOnly: boolean;
  /** Returns the URL of the payment page (hosted by us or the provider). */
  startCheckout(req: CheckoutRequest): Promise<{ url: string }>;
  /** Reads a payment from the provider (never trust the browser's redirect). */
  getPayment(id: string): Promise<Payment | null>;
  /** Charges a saved token (renewals). */
  chargeToken(req: { token: string; amount: number; currency: Currency; description: string; invoiceId: string }): Promise<Payment>;
  refund(paymentId: string, amount: number): Promise<{ ok: boolean; error?: string }>;
  /** Verifies a webhook request and returns the payment id it is about. */
  parseWebhook(req: Request): Promise<{ paymentId: string } | null>;
}
