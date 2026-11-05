"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, CreditCard, MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { supportWhatsappUrl } from "@/config/site";
import { agencyAutoRenew, agencyCheckout, agencyNextPlan } from "./billing-actions";

export type BillingPlanCard = { key: "starter" | "growth" | "custom"; name: string; creators: string; price: string; per: string; yearPrice?: string; yearPer?: string; popular?: string };

type Pay = { online: boolean; cycle: "monthly" | "yearly" | null; autoRenew: boolean; running: boolean };

/**
 * Plan cards with a monthly / yearly switch. With online payment (owner, Nov 2026): "Subscribe" opens the checkout; while
 * a paid plan renews automatically, the other cycle / the smaller plan are changed for the next renewal. Without it (or for
 * the large custom plan) the button opens WhatsApp with a prefilled message.
 */
export function BillingPlans({ plans, current, agency, features, pay }: { plans: BillingPlanCard[]; current: string; agency: string; features: string[]; pay: Pay }) {
  const t = useTranslations("AgencyBilling");
  const locale = useLocale();
  const router = useRouter();
  const [yearly, setYearly] = useState(pay.cycle === "yearly");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, start] = useTransition();
  const cycle = yearly ? "yearly" : "monthly";
  const renewing = pay.running && pay.autoRenew;
  const subscribe = (key: string) => {
    setBusy(key); setMsg(null);
    start(async () => {
      const res = await agencyCheckout(key, cycle, locale.startsWith("en") ? "en" : "ar");
      if ("url" in res) { window.location.href = res.url; return; }
      setMsg({ ok: false, text: t(`errors.${res.error}`) }); setBusy("");
    });
  };
  const nextPlan = (key: string) => {
    setBusy(key); setMsg(null);
    start(async () => {
      const res = await agencyNextPlan(key, cycle);
      setMsg(res.ok ? { ok: true, text: t("nextSaved") } : { ok: false, text: t("errors.failed") });
      setBusy(""); if (res.ok) router.refresh();
    });
  };
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
              {(() => {
                const btn = "mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold disabled:opacity-60";
                if (custom || !pay.online) {
                  return mine ? null : (
                    <a href={supportWhatsappUrl(text)} target="_blank" rel="noopener noreferrer" className={`${btn} bg-blue text-on-blue`}>
                      <MessageCircle aria-hidden="true" size={16} /> {custom ? t("talk") : t("choose")}
                    </a>
                  );
                }
                // Already renewing on this plan and cycle: nothing to do.
                if (renewing && mine && pay.cycle === cycle) return <p className="mt-auto text-center text-sm font-bold text-good">{t("renewsAuto")}</p>;
                // Same plan in the other cycle, or the smaller plan while the bigger one is paid: from the next renewal.
                if (renewing && (mine || (current === "growth" && p.key === "starter"))) {
                  return (
                    <button type="button" disabled={!!busy} onClick={() => nextPlan(p.key)} className={`${btn} border border-line bg-card`}>
                      {busy === p.key ? t("saving") : t("atRenewal")}
                    </button>
                  );
                }
                return (
                  <button type="button" disabled={!!busy} onClick={() => subscribe(p.key)} className={`${btn} bg-blue text-on-blue`}>
                    <CreditCard aria-hidden="true" size={16} /> {busy === p.key ? t("opening") : mine ? t("renew") : t("subscribe")}
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
    </div>
  );
}

/** Auto-renew switch for a paid plan with a saved card. */
export function AgencyAutoRenew({ initial }: { initial: boolean }) {
  const t = useTranslations("AgencyBilling");
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  return (
    <Switch
      checked={on} label={t("autoRenew")} hint={on ? t("autoRenewOn") : t("autoRenewOff")}
      onChange={(v) => { setOn(v); start(async () => { const r = await agencyAutoRenew(v); if (!r.ok) setOn(!v); else router.refresh(); }); }}
    />
  );
}
