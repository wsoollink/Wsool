import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Currency } from "@/generated/prisma/enums";
import { siteOrigin } from "@/lib/site-url";
import type { Payment, PaymentProvider } from "./types";

/**
 * Moyasar (owner, Nov 2026). The browser pays on our page /billing/pay?invoice=<id> with Moyasar's
 * own form (npm "moyasar-payment-form": card, mada, Apple Pay) and `save_card: true`, so the paid
 * payment carries a card token (`source.token`). Renewals charge that token from the server
 * (POST /v1/payments, source type "token", no 3-D Secure: the customer agreed at the first payment).
 *
 * Env: MOYASAR_PUBLISHABLE_KEY (pk_test_… / pk_live_…, used by the form), MOYASAR_SECRET_KEY (server only),
 * MOYASAR_WEBHOOK_SECRET (the "secret token" set on the webhook in Moyasar's dashboard).
 * Test keys make the provider staff-only, like the mock one. Amounts go to Moyasar in the smallest
 * unit (halalas / cents). Tokenization must be enabled on the account by Moyasar.
 */
const API = (process.env.MOYASAR_API_BASE || "https://api.moyasar.com").replace(/\/$/, "");
const secretKey = () => process.env.MOYASAR_SECRET_KEY ?? "";
export const moyasarPublishableKey = () => process.env.MOYASAR_PUBLISHABLE_KEY ?? "";
export const moyasarConfigured = () => !!secretKey() && !!moyasarPublishableKey();

type MoyasarPayment = {
  id: string;
  status: "initiated" | "paid" | "failed" | "authorized" | "captured" | "refunded" | "voided" | "verified";
  amount: number;
  currency: string;
  metadata?: Record<string, string> | null;
  source?: { type?: string; company?: string; number?: string; token?: string | null; message?: string | null; transaction_url?: string | null } | null;
};

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await fetch(`${API}/v1${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`,
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) console.error("[moyasar]", init.method ?? "GET", path.replace(/\/[0-9a-f-]{36}/g, "/:id"), res.status, JSON.stringify(data).slice(0, 300));
  return { ok: res.ok, status: res.status, data };
}

const minor = (amount: number) => Math.round(amount * 100);

/** "mada •••• 4242" */
function methodLabel(src: MoyasarPayment["source"]) {
  if (!src) return undefined;
  const last4 = src.number?.replace(/\D/g, "").slice(-4);
  const brand = src.company || (src.type === "applepay" ? "Apple Pay" : "Card");
  return last4 ? `${brand} •••• ${last4}` : brand;
}

function toPayment(p: MoyasarPayment): Payment | null {
  const currency = p.currency?.toUpperCase();
  if (currency !== "SAR" && currency !== "USD") return null;
  const status = p.status === "paid" || p.status === "captured" ? "paid"
    : p.status === "initiated" || p.status === "authorized" ? "pending"
    : "failed";
  return {
    id: p.id,
    status,
    amount: p.amount / 100,
    currency: currency as Currency,
    invoiceId: p.metadata?.invoice_id ?? null,
    ...(status === "paid" && p.source?.token && { token: p.source.token }),
    ...(status === "paid" && { methodLabel: methodLabel(p.source) }),
    ...(status !== "paid" && { failureReason: p.source?.message || p.status }),
  };
}

export const moyasarProvider: PaymentProvider = {
  name: "moyasar",
  get testOnly() {
    return !secretKey().startsWith("sk_live_");
  },
  async startCheckout({ invoiceId }) {
    // The form runs on our own page (it needs the browser for card entry, 3-D Secure and Apple Pay).
    return { url: `/billing/pay?invoice=${invoiceId}` };
  },
  async getPayment(id) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
    const { data } = await call<MoyasarPayment>(`/payments/${encodeURIComponent(id)}`);
    return data?.id ? toPayment(data) : null;
  },
  async chargeToken({ token, amount, currency, description, invoiceId }) {
    const { data } = await call<MoyasarPayment>("/payments", {
      method: "POST",
      body: {
        // Our renewal invoice id: a repeated call (timeout, retry) can't charge the card twice.
        given_id: invoiceId,
        amount: minor(amount),
        currency,
        description,
        callback_url: `${siteOrigin()}/billing/return?invoice=${invoiceId}`,
        source: { type: "token", token, "3ds": false },
        metadata: { invoice_id: invoiceId, kind: "renewal" },
      },
    });
    const payment = data?.id ? toPayment(data) : null;
    if (!payment) return { id: `error_${invoiceId}`, status: "failed", amount, currency, invoiceId, failureReason: "Provider error" };
    // A token charge that still asks for 3-D Secure can't finish without the customer: treat it as failed.
    if (payment.status === "pending") return { ...payment, status: "failed", failureReason: "Card needs verification (3-D Secure)" };
    return payment;
  },
  async refund(paymentId, amount) {
    const { ok, data } = await call<MoyasarPayment>(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST", body: { amount: minor(amount) } });
    return ok && data?.status === "refunded" ? { ok: true } : { ok: false, error: "provider" };
  },
  async parseWebhook(req) {
    const expected = process.env.MOYASAR_WEBHOOK_SECRET ?? "";
    const body = (await req.json().catch(() => null)) as { secret_token?: string; type?: string; data?: { id?: string } } | null;
    if (!expected || !body?.secret_token || !body.data?.id) return null;
    const a = Buffer.from(body.secret_token), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { paymentId: body.data.id };
  },
};
