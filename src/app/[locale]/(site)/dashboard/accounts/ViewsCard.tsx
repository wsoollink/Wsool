"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { fromIntlLocale } from "@/i18n/config";
import { digitsOnly, formatNumber } from "@/lib/format";
import { saveMonthlyViews } from "./actions";

export type ViewsAccount = { id: string; platform: Platform; handle: string; views: number | null };

/**
 * Monthly views: the month is picked once at the top, then one row per added
 * account. The public box shows the sum; all rows empty hides it.
 */
export function ViewsCard({ accounts, initialMonthsAgo, monthLabels }: {
  accounts: ViewsAccount[];
  initialMonthsAgo: number;
  /** This month and the two before, formatted on the server. */
  monthLabels: string[];
}) {
  const t = useTranslations("AccountsPage");
  const e = useTranslations("EditPage");
  const lang = fromIntlLocale(useLocale());
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(accounts.map((a) => [a.id, a.views === null ? "" : String(a.views)])),
  );
  const [monthsAgo, setMonthsAgo] = useState(Math.min(2, Math.max(0, initialMonthsAgo)));
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();
  const control = "h-12 w-full rounded-xl border border-navy/16 bg-white px-3 text-[15px]";

  const filled = accounts.filter((a) => values[a.id] !== "");
  const total = filled.reduce((sum, a) => sum + Number(values[a.id]), 0);

  const save = () =>
    startTransition(async () => {
      const res = await saveMonthlyViews({
        monthsAgo: monthsAgo as 0 | 1 | 2,
        byAccount: accounts.map((a) => ({ accountId: a.id, views: values[a.id] === "" ? null : Number(values[a.id]) })),
      });
      setStatus(res.ok ? "saved" : "failed");
    });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("monthlyViews")}</h2>
        <p className="text-xs text-muted">{t("monthlyViewsHint")}</p>
      </div>
      {accounts.length === 0 ? (
        <p className="rounded-xl bg-navy/5 px-4 py-3 text-sm text-muted">{t("viewsNoAccounts")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="views-month" className="text-[13px] font-medium">{t("month")}</label>
            <select id="views-month" value={monthsAgo} onChange={(ev) => { setMonthsAgo(Number(ev.target.value)); setStatus(""); }} className={control}>
              {monthLabels.map((label, ago) => <option key={ago} value={ago}>{label}</option>)}
            </select>
          </div>
          <ul className="flex flex-col gap-2">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <label htmlFor={`views-${a.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <PlatformIcon platform={a.platform} className="shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{PLATFORM_NAMES[a.platform]}</span>
                    <span dir="ltr" className="truncate text-xs text-muted">@{a.handle}</span>
                  </span>
                </label>
                <input
                  id={`views-${a.id}`} dir="ltr" inputMode="numeric" value={values[a.id]} placeholder="0" autoComplete="off"
                  onChange={(ev) => { const v = digitsOnly(ev.target.value, 11); setValues((cur) => ({ ...cur, [a.id]: v })); setStatus(""); }}
                  className={`${control} max-w-[50%] sm:max-w-56`}
                />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-navy/5 px-4 py-3" aria-live="polite">
            <span className="text-[13px] text-muted">{filled.length === 0 ? t("viewsHidden") : t("viewsTotal")}</span>
            {filled.length > 0 && <span dir="ltr" className="font-numbers text-[22px] font-black">{formatNumber(total, lang)}</span>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p role="status" aria-live="polite" className={`text-sm ${status === "failed" ? "text-bad" : "text-good"}`}>
              {status === "saved" ? e("saved") : status === "failed" ? e("errors.failed") : ""}
            </p>
            <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
              {pending ? e("saving") : e("save")}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
