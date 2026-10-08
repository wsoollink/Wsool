import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Currency } from "@/generated/prisma/enums";
import type { Payment, PaymentProvider } from "./types";

/**
 * Test provider: no money moves. Payment ids carry their outcome and are
 * signed with a server secret, so a browser can't forge a "paid" result.
 * Tokens: "mock_tok_ok" renews fine, "mock_tok_fail" always fails.
 */
const secret = () => process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "local-mock";

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 22);
}

/** Builds a signed mock payment id for the mock checkout page. */
export function mockPaymentId(invoiceId: string, outcome: "paid" | "failed", amount: number, currency: Currency, saveAs: "ok" | "fail") {
  const body = [outcome, invoiceId, amount.toFixed(2), currency, saveAs].join(".");
  return `mock.${body}.${sign(body)}`;
}

function parse(id: string): Payment | null {
  const parts = id.split(".");
  if (parts.length !== 8 || parts[0] !== "mock") return null;
  const [, outcome, invoiceId, whole, cents, currency, saveAs, sig] = parts;
  const body = [outcome, invoiceId, `${whole}.${cents}`, currency, saveAs].join(".");
  const expected = Buffer.from(sign(body));
  if (expected.length !== Buffer.from(sig).length || !timingSafeEqual(expected, Buffer.from(sig))) return null;
  if ((outcome !== "paid" && outcome !== "failed") || (currency !== "SAR" && currency !== "USD")) return null;
  return {
    id,
    status: outcome,
    amount: Number(`${whole}.${cents}`),
    currency,
    invoiceId,
    ...(outcome === "paid" && { token: `mock_tok_${saveAs}`, methodLabel: saveAs === "ok" ? "Test card •••• 4242" : "Test card •••• 0002" }),
    ...(outcome === "failed" && { failureReason: "Card declined (test)" }),
  };
}

export const mockProvider: PaymentProvider = {
  name: "mock",
  testOnly: true,
  async startCheckout({ invoiceId }) {
    return { url: `/billing/mock/${invoiceId}` };
  },
  async getPayment(id) {
    return parse(id);
  },
  async chargeToken({ token, amount, currency, invoiceId }) {
    const ok = token === "mock_tok_ok";
    const id = `mock_renewal_${invoiceId}`;
    return ok
      ? { id, status: "paid", amount, currency, invoiceId, token, methodLabel: "Test card •••• 4242" }
      : { id, status: "failed", amount, currency, invoiceId, failureReason: "Card declined (test)" };
  },
  async refund() {
    return { ok: true };
  },
  async parseWebhook() {
    return null;
  },
};
