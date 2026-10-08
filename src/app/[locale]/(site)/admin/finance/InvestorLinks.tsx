"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy, Link2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FINANCE_PERIODS, INVESTOR_SECTIONS, type InvestorSection } from "@/config/finance";
import { createInvestorLink, revokeInvestorLink } from "./actions";

export type LinkRow = { id: string; label: string; status: "active" | "expired" | "revoked"; expires: string; views: number; password: boolean; sections: string[] };

const control = "min-h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-base";

/** Owner only: read-only links for investors (sections, period, expiry, optional password). */
export function InvestorLinks({ links }: { links: LinkRow[] }) {
  const t = useTranslations("Finance");
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [sections, setSections] = useState<InvestorSection[]>([...INVESTOR_SECTIONS]);
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [days, setDays] = useState(30);
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const create = (ev: React.FormEvent) => {
    ev.preventDefault();
    startTransition(async () => {
      const res = await createInvestorLink({ label, sections, months, expiresInDays: days, password });
      if (res.ok) { setCreated(res.url); setCopied(false); setLabel(""); setPassword(""); router.refresh(); }
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("investorTitle")}</h2>
        <p className="text-xs text-muted">{t("investorHint")}</p>
      </div>
      <form onSubmit={create} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><label htmlFor="inv-label" className="text-xs font-medium">{t("linkLabel")}</label><input id="inv-label" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} required placeholder={t("linkLabelPlaceholder")} className={control} /></div>
          <div className="flex flex-col gap-1"><label htmlFor="inv-pass" className="text-xs font-medium">{t("password")}</label><input id="inv-pass" type="text" dir="ltr" autoComplete="off" value={password} maxLength={100} onChange={(e) => setPassword(e.target.value)} className={control} /></div>
          <div className="flex flex-col gap-1"><label htmlFor="inv-months" className="text-xs font-medium">{t("period")}</label>
            <select id="inv-months" value={months} onChange={(e) => setMonths(Number(e.target.value) as 3 | 6 | 12)} className={control}>
              {FINANCE_PERIODS.map((m) => <option key={m} value={m}>{t("lastMonths", { n: m })}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1"><label htmlFor="inv-days" className="text-xs font-medium">{t("expiresIn")}</label>
            <select id="inv-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={control}>
              {[7, 30, 90].map((d) => <option key={d} value={d}>{t("days", { n: d })}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="flex flex-wrap gap-x-4">
          <legend className="mb-1 text-xs font-medium">{t("sections")}</legend>
          {INVESTOR_SECTIONS.map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="size-5 accent-blue" checked={sections.includes(s)} onChange={(e) => setSections(e.target.checked ? [...sections, s] : sections.filter((x) => x !== s))} />
              {t(`sectionNames.${s}`)}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={pending || !label.trim() || sections.length === 0} className={buttonClasses("primary", "self-start")}>
          <Link2 aria-hidden="true" size={18} /> {t("createLink")}
        </button>
      </form>

      {created && (
        <div className="flex flex-col gap-2 rounded-xl bg-good/10 p-3">
          <p className="text-sm text-good">{t("linkCreated")}</p>
          <div className="flex gap-2">
            <input readOnly dir="ltr" value={created} aria-label={t("linkLabel")} className={`${control} text-sm`} onFocus={(e) => e.target.select()} />
            <button type="button" onClick={() => { navigator.clipboard.writeText(created); setCopied(true); }} className={buttonClasses("secondary", "shrink-0")}>
              <Copy aria-hidden="true" size={16} /> {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>
      )}

      {links.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
              <span className="font-medium">{l.label}</span>
              <span className={l.status === "active" ? "text-good" : "text-muted"}>{t(`linkStatus.${l.status}`)}</span>
              <span className="text-muted">{t("expires", { date: l.expires })}</span>
              <span className="text-muted">{t("views", { n: l.views })}</span>
              {l.password && <span className="text-muted">{t("withPassword")}</span>}
              {l.status === "active" && (
                <button type="button" onClick={() => { if (window.confirm(t("confirmRevoke"))) startTransition(async () => { await revokeInvestorLink(l.id); router.refresh(); }); }} className="ms-auto min-h-11 px-2 text-bad underline">
                  {t("revoke")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
