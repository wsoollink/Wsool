"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { FREE_LIMITS, PRICES } from "@/config/plans";
import { fromIntlLocale } from "@/i18n/config";
import { formatPrice } from "@/lib/format";
import { applyDiscount, checkout } from "./actions";
import { Tag, X } from "lucide-react";

/**
 * Plan comparison from the design (Free vs Paid, monthly/yearly switch) with
 * the pay button. Prices come from config (VAT included); rows from FREE_LIMITS.
 */
export function PlanPicker({ defaultCurrency, canPay, renew, showTrial }: { defaultCurrency: "SAR" | "USD"; canPay: boolean; renew: boolean; showTrial: boolean }) {
  const t = useTranslations("Billing");
  const lang = fromIntlLocale(useLocale());
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [discount, setDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [applying, startApply] = useTransition();
  const prices = PRICES[currency];
  // First payment only; the server recomputes it at checkout.
  const pay1 = (v: number) => (discount ? Math.round(v * (100 - discount.percent)) / 100 : v);
  const monthsFree = Math.round(12 - prices.yearly / prices.monthly);
  const yes = "✓", no = "—";

  const rows: { label: string; free: string; pro: string }[] = [
    { label: t("cmp.page"), free: yes, pro: yes },
    { label: t("cmp.templates"), free: String(FREE_LIMITS.templates.length), pro: "8" },
    { label: t("cmp.works"), free: String(FREE_LIMITS.portfolioItems), pro: t("cmp.unlimited") },
    { label: t("cmp.rates"), free: yes, pro: yes },
    { label: t("cmp.audience"), free: yes, pro: yes },
    { label: t("cmp.badge"), free: no, pro: yes },
    { label: t("cmp.analytics"), free: FREE_LIMITS.analytics ? yes : no, pro: yes },
    { label: t("cmp.pdf"), free: FREE_LIMITS.pdf ? yes : no, pro: yes },
    { label: t("cmp.branding"), free: FREE_LIMITS.hideBranding ? yes : no, pro: yes },
  ];

  const pay = () =>
    startTransition(async () => {
      setError("");
      const res = await checkout(cycle, currency, discount?.code);
      if (res?.error) setError(t(`errors.${res.error}`));
    });

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-bold">{renew ? t("renewTitle") : t("compare")}</h2>
      <div role="group" aria-label={t("cycle")} className="grid grid-cols-2 gap-1 rounded-[14px] bg-navy/5 p-1">
        {(["monthly", "yearly"] as const).map((c) => (
          <button key={c} type="button" aria-pressed={cycle === c} onClick={() => setCycle(c)} className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-bold ${cycle === c ? "bg-white text-navy shadow-card" : "text-muted"}`}>
            {t(c)}
            {c === "yearly" && <span className="rounded-full bg-good/10 px-2 py-0.5 text-[11px] text-good">{t("monthsFree", { n: monthsFree })}</span>}
          </button>
        ))}
      </div>

      <table className="w-full text-[13px]">
        <thead>
          <tr>
            <th scope="col" className="sr-only">{t("cmp.feature")}</th>
            <th scope="col" className="w-[76px] pb-2 text-center text-[12.5px] font-bold">
              {t("freePlan")}<span dir="ltr" className="block text-xs font-medium text-muted">0</span>
            </th>
            <th scope="col" className="w-[84px] rounded-t-[10px] bg-navy/5 pt-2 pb-2 text-center text-[12.5px] font-bold text-blue">
              {t("paidPlan")}
              <span dir="ltr" className="block text-xs font-medium text-muted">
                {discount && <s className="me-1 opacity-70">{formatPrice(prices[cycle], currency, lang)}</s>}
                {formatPrice(pay1(prices[cycle]), currency, lang)}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-navy/6">
              <th scope="row" className="py-2.5 text-start font-normal">{r.label}</th>
              <td className={`text-center font-medium ${r.free === no ? "text-muted" : ""}`}>{r.free}</td>
              <td className="bg-navy/5 text-center font-bold text-good">{r.pro}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t("currency")}</span>
        {(["SAR", "USD"] as const).map((c) => (
          <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={`min-h-11 rounded-full px-4 ${currency === c ? "bg-navy text-white" : "bg-navy/5"}`}>
            {c}
          </button>
        ))}
      </div>

      {showTrial && (
        <div className="flex flex-col gap-1 rounded-xl bg-good/8 p-3">
          <span className="text-[13.5px] font-bold text-good">{t("trialTitle")}</span>
          <span className="text-[12.5px]">{t("trialBody")}</span>
        </div>
      )}
      <p className="text-xs text-muted">{t("vatNote")}</p>

      {canPay && (discount ? (
        <div className="flex items-center gap-3 rounded-xl bg-good/8 p-3">
          <Tag aria-hidden="true" size={18} className="shrink-0 text-good" />
          <p className="flex-1 text-[13px]">
            <b dir="ltr" className="font-bold">{discount.code}</b> · {t("discountApplied", { percent: discount.percent })}
            <span className="block text-xs text-muted">{t("discountFirstOnly")}</span>
          </p>
          <button type="button" onClick={() => { setDiscount(null); setCodeInput(""); }} aria-label={t("removeCode")} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-navy/5">
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      ) : codeOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startApply(async () => {
              setCodeError("");
              const res = await applyDiscount(codeInput);
              if ("error" in res) setCodeError(t(`codeErrors.${res.error}`));
              else { setDiscount(res); setCodeOpen(false); }
            });
          }}
          className="flex flex-col gap-1.5"
        >
          <label htmlFor="discount-code" className="text-[13px] font-medium">{t("discountCode")}</label>
          <div className="flex gap-2">
            <input
              id="discount-code" value={codeInput} onChange={(e) => { setCodeInput(e.target.value); setCodeError(""); }}
              dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={30} placeholder="WSL-XXXXXX"
              aria-invalid={!!codeError} aria-describedby={codeError ? "discount-error" : undefined}
              className="h-12 min-w-0 flex-1 rounded-xl border border-navy/16 bg-white px-3 text-[15px] uppercase aria-[invalid=true]:border-bad"
            />
            <button type="submit" disabled={applying || !codeInput.trim()} className="inline-flex h-12 shrink-0 items-center rounded-full bg-navy px-5 text-sm font-bold text-white disabled:opacity-50">
              {applying ? t("applying") : t("apply")}
            </button>
          </div>
          {codeError && <p id="discount-error" role="alert" className="text-xs text-bad">{codeError}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => setCodeOpen(true)} className="inline-flex min-h-11 items-center gap-2 self-start text-[13.5px] font-bold text-blue">
          <Tag aria-hidden="true" size={16} /> {t("haveCode")}
        </button>
      ))}

      {canPay ? (
        <button type="button" onClick={pay} disabled={pending} aria-busy={pending} className="inline-flex h-12 items-center justify-center rounded-full bg-blue text-[15px] font-bold text-white disabled:opacity-70">
          {pending ? t("redirecting") : t("pay", { price: formatPrice(pay1(prices[cycle]), currency, lang) })}
        </button>
      ) : (
        <p className="rounded-xl bg-blue/10 p-3 text-sm text-blue">{t("comingSoon")}</p>
      )}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </Card>
  );
}
