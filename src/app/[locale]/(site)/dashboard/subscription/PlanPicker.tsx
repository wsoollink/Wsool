"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PRICES } from "@/config/plans";
import type { Locale } from "@/i18n/config";
import { formatPrice } from "@/lib/format";
import { checkout } from "./actions";

/** Monthly / yearly choice and the button to pay. Prices come from config (VAT included). */
export function PlanPicker({ defaultCurrency, canPay, renew }: { defaultCurrency: "SAR" | "USD"; canPay: boolean; renew: boolean }) {
  const t = useTranslations("Billing");
  const lang = useLocale().slice(0, 2) as Locale;
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const prices = PRICES[currency];
  const monthsFree = Math.round(12 - prices.yearly / prices.monthly);

  const pay = () =>
    startTransition(async () => {
      setError("");
      const res = await checkout(cycle, currency);
      if (res?.error) setError(t(`errors.${res.error}`));
    });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{renew ? t("renewTitle") : t("upgradeTitle")}</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
          {(["f1", "f2", "f3", "f4"] as const).map((f) => (
            <li key={f} className="flex items-center gap-2"><Check aria-hidden="true" size={16} className="text-good" /> {t(`features.${f}`)}</li>
          ))}
        </ul>
      </div>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">{t("cycle")}</legend>
        {(["monthly", "yearly"] as const).map((c) => (
          <label key={c} className="flex min-h-11 cursor-pointer flex-col gap-1 rounded-2xl border border-line p-4 has-[:checked]:border-blue has-[:checked]:bg-blue/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue">
            <input type="radio" name="cycle" checked={cycle === c} onChange={() => setCycle(c)} className="sr-only" />
            <span className="flex items-center justify-between text-sm font-medium">
              {t(c)}
              {c === "yearly" && <span className="rounded-full bg-good/10 px-2 py-0.5 text-xs font-semibold text-good">{t("monthsFree", { n: monthsFree })}</span>}
            </span>
            <span className="font-numbers text-2xl font-bold">{formatPrice(prices[c], currency, lang)}</span>
            <span className="text-xs text-muted">{c === "monthly" ? t("perMonth") : t("perYear")}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t("currency")}</span>
        {(["SAR", "USD"] as const).map((c) => (
          <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={`min-h-11 rounded-full px-4 ${currency === c ? "bg-navy text-white" : "border border-line"}`}>
            {c}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{t("vatNote")}</p>

      {canPay ? (
        <button type="button" onClick={pay} disabled={pending} aria-busy={pending} className={buttonClasses("primary", "self-start")}>
          {pending ? t("redirecting") : t("pay", { price: formatPrice(prices[cycle], currency, lang) })}
        </button>
      ) : (
        <p className="rounded-xl bg-blue/10 p-3 text-sm text-blue">{t("comingSoon")}</p>
      )}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </Card>
  );
}
