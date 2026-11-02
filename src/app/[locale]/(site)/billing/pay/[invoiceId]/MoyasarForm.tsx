"use client";

import { useEffect, useRef, useState } from "react";
import "moyasar-payment-form/dist/moyasar.css";
import { rememberPayment } from "./actions";

type Props = {
  invoiceId: string;
  amount: number;
  currency: "SAR" | "USD";
  description: string;
  publishableKey: string;
  lang: "ar" | "en";
  errorText: string;
};

/**
 * Moyasar's payment form (card, mada, Apple Pay). The card is saved (`save_card`) so renewals can be
 * charged from the server. Moyasar sends the browser to /billing/return when the payment (and any
 * 3-D Secure step) is done; that route reads the payment from Moyasar before changing anything.
 */
export function MoyasarForm({ invoiceId, amount, currency, description, publishableKey, lang, errorText }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import("moyasar-payment-form")) as unknown as { default?: { init: (c: object) => void }; init?: (c: object) => void };
        const Moyasar = mod.default ?? mod;
        if (cancelled || !ref.current || !Moyasar.init) return;
        ref.current.innerHTML = "";
        Moyasar.init({
          element: ref.current,
          amount: Math.round(amount * 100),
          currency,
          description,
          publishable_api_key: publishableKey,
          callback_url: `${window.location.origin}/billing/return?invoice=${invoiceId}`,
          methods: ["creditcard", "applepay"],
          supported_networks: currency === "SAR" ? ["mada", "visa", "mastercard"] : ["visa", "mastercard"],
          language: lang,
          metadata: { invoice_id: invoiceId },
          credit_card: { save_card: true },
          apple_pay: {
            country: "SA",
            label: "Wsool",
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
            save_card: true,
          },
          on_completed: async (payment: { id: string }) => {
            await rememberPayment(invoiceId, payment.id).catch(() => {});
          },
        });
      } catch (e) {
        console.error("[moyasar] form", e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceId, amount, currency, description, publishableKey, lang]);

  if (failed) return <p role="alert" className="text-sm text-bad">{errorText}</p>;
  // Moyasar's form is styled for a light background: keep it on white in dark mode too.
  return <div ref={ref} dir={lang === "ar" ? "rtl" : "ltr"} className="mysr-form min-h-48 rounded-xl bg-white p-1 text-[#021941]" />;
}
