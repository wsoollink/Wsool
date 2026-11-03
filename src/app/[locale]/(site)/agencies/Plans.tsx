"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export type AgencyPlan = { name: string; creators: string; price: string; per: string; yearPrice?: string; yearPer?: string; popular?: string };
type Texts = { monthly: string; yearly: string; yearlyBadge: string; cta: string; ctaBig: string; features: string[]; switchLabel: string };

/** Agency plans with a monthly / yearly switch (owner, Nov 2026: yearly = 10 months, two months free). */
export function AgencyPlans({ plans, texts, href }: { plans: AgencyPlan[]; texts: Texts; href: string }) {
  const [yearly, setYearly] = useState(false);
  return (
    <>
      <div role="group" aria-label={texts.switchLabel} className="mx-auto mb-12 flex w-fit items-center gap-1 rounded-full border border-line bg-card p-1 shadow-card">
        {([false, true] as const).map((y) => (
          <button
            key={String(y)} type="button" aria-pressed={yearly === y} onClick={() => setYearly(y)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors ${yearly === y ? "bg-[#021941] text-white dark:bg-[#7DD3FC] dark:text-[#021941]" : "text-muted hover:text-navy"}`}
          >
            {y ? texts.yearly : texts.monthly}
            {y && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${yearly ? "bg-white/20" : "bg-good/10 text-good"}`}>{texts.yearlyBadge}</span>}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const hot = !!p.popular;
          const price = yearly && p.yearPrice ? p.yearPrice : p.price;
          const per = yearly && p.yearPer ? p.yearPer : p.per;
          return (
            <div key={p.name} className={hot
              ? "relative flex flex-col overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0A3A8C] via-[#021941] to-[#021941] p-7 text-white shadow-[0_40px_80px_-40px_rgba(2,25,65,0.8)] lg:-my-4 lg:py-11"
              : "flex flex-col rounded-[28px] border border-line bg-card p-7"}>
              {hot && <div aria-hidden="true" className="absolute -top-24 -end-16 size-64 rounded-full bg-[#22B8F0]/25 blur-3xl" />}
              <div className="relative mb-1 flex items-center justify-between gap-2">
                <h3 className="text-xl font-black">{p.name}</h3>
                {hot && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{p.popular}</span>}
              </div>
              <p className={`relative mb-6 text-sm ${hot ? "opacity-75" : "text-muted"}`}>{p.creators}</p>
              <p className="relative mb-6 flex items-end gap-2" aria-live="polite">
                <span className={`font-numbers leading-none font-black ${p.per ? "text-6xl" : "text-4xl"}`} dir="ltr">{price}</span>
                {per && <span className={`pb-1.5 text-sm ${hot ? "opacity-75" : "text-muted"}`}>{per}</span>}
              </p>
              <Link href={href} className={hot
                ? "relative mb-7 inline-flex min-h-12 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#021941] hover:bg-white/90"
                : "mb-7 inline-flex min-h-12 items-center justify-center rounded-full border border-line text-[15px] font-bold hover:bg-hover"}>
                {p.per ? texts.cta : texts.ctaBig}
              </Link>
              <ul className={`relative flex flex-col gap-3 text-sm ${hot ? "" : "text-muted"}`}>
                {texts.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5"><Check aria-hidden="true" size={16} className={hot ? "text-[#7DD3FC]" : "text-good"} />{f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
