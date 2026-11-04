"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MessageCircle } from "lucide-react";
import { supportWhatsappUrl } from "@/config/site";

export type BillingPlanCard = { key: "starter" | "growth" | "custom"; name: string; creators: string; price: string; per: string; yearPrice?: string; yearPer?: string; popular?: string };

/** Plan cards with a monthly / yearly switch; "Request this plan" opens WhatsApp with a prefilled message (no online payment yet). */
export function BillingPlans({ plans, current, agency, features }: { plans: BillingPlanCard[]; current: string; agency: string; features: string[] }) {
  const t = useTranslations("AgencyBilling");
  const [yearly, setYearly] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label={t("plansTitle")} className="flex w-fit items-center gap-1 rounded-full border border-line bg-card p-1">
        {([false, true] as const).map((y) => (
          <button key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold ${yearly === y ? "bg-navy text-on-navy" : "text-muted hover:text-navy"}`}>
            {y ? t("yearly") : t("monthly")}
            {y && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${yearly ? "bg-white/20" : "bg-good/10 text-good"}`}>{t("yearlyBadge")}</span>}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {plans.map((p) => {
          const mine = p.key === current;
          const custom = p.key === "custom";
          const price = yearly && p.yearPrice ? p.yearPrice : p.price;
          const per = yearly && p.yearPer ? p.yearPer : p.per;
          const text = custom
            ? t("talkMessage", { agency })
            : t("whatsappMessage", { agency, plan: p.name, cycle: t(`cycle.${yearly ? "yearly" : "monthly"}`) });
          return (
            <div key={p.key} className={`flex flex-col gap-4 rounded-card border bg-card p-5 shadow-card ${mine ? "border-blue ring-2 ring-blue/20" : "border-line"}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black">{p.name}</h3>
                {mine ? <span className="rounded-full bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">{t("currentBadge")}</span>
                  : p.popular ? <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-bold text-muted">{p.popular}</span> : null}
              </div>
              <p className="text-sm text-muted">{p.creators}</p>
              <p className="flex items-baseline gap-1.5">
                <span className="font-numbers text-3xl font-black">{price}</span>
                {per && <span className="text-sm text-muted">{per}</span>}
              </p>
              <ul className="flex flex-col gap-2 text-sm text-muted">
                {features.map((f) => <li key={f} className="flex items-center gap-2"><Check aria-hidden="true" size={15} className="text-good" />{f}</li>)}
              </ul>
              {!mine && (
                <a href={supportWhatsappUrl(text)} target="_blank" rel="noopener noreferrer"
                  className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue px-5 text-sm font-bold text-on-blue">
                  <MessageCircle aria-hidden="true" size={16} /> {custom ? t("talk") : t("choose")}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
