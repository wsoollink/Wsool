import "server-only";
import { mockProvider } from "./mock";
import { moyasarConfigured, moyasarProvider } from "./moyasar";
import type { PaymentProvider } from "./types";

/**
 * The active provider, from PAYMENT_PROVIDER: "moyasar" (owner, Nov 2026; needs its keys, test keys = staff only)
 * or "mock" (staff-only test payments). Unset = payments are off (the subscription page says so).
 */
export function paymentProvider(): PaymentProvider | null {
  switch (process.env.PAYMENT_PROVIDER) {
    case "mock":
      return mockProvider;
    case "moyasar":
      return moyasarConfigured() ? moyasarProvider : null;
    default:
      return null;
  }
}

export type { Payment, PaymentProvider } from "./types";
