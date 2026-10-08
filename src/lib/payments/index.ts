import "server-only";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

/**
 * The active provider, from PAYMENT_PROVIDER. Only "mock" exists until the
 * owner picks Moyasar or Tap; add the real one next to mock.ts and register
 * it here. Unset = payments are off (the subscription page says so).
 */
export function paymentProvider(): PaymentProvider | null {
  switch (process.env.PAYMENT_PROVIDER) {
    case "mock":
      return mockProvider;
    default:
      return null;
  }
}

export type { Payment, PaymentProvider } from "./types";
