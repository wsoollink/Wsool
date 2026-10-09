"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fromIntlLocale } from "@/i18n/config";
import { digitsOnly, formatNumber } from "@/lib/format";
import { saveMonthlyViews } from "./actions";

/** Total monthly views across platforms for a chosen month (the box on the public page). Empty hides it. */
export function ViewsCard({ initial, initialMonthsAgo, monthLabels }: { initial: number | null; initialMonthsAgo: number; /** This month and the two before, formatted on the server. */ monthLabels: string[] }) {
  const t = useTranslations("AccountsPage");
  const e = useTranslations("EditPage");
  const lang = fromIntlLocale(useLocale());
  const [value, setValue] = useState(initial === null ? "" : String(initial));
  const [monthsAgo, setMonthsAgo] = useState(Math.min(2, Math.max(0, initialMonthsAgo)));
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();
  const control = "h-12 w-full rounded-xl border border-navy/16 bg-white px-3 text-[15px]";

  const save = () =>
    startTransition(async () => {
      const res = await saveMonthlyViews(value === "" ? null : Number(value), monthsAgo);
      setStatus(res.ok ? "saved" : "failed");
    });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("monthlyViews")}</h2>
        <p className="text-xs text-muted">{t("monthlyViewsHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="views-month" className="text-[13px] font-medium">{t("month")}</label>
          <select id="views-month" value={monthsAgo} onChange={(ev) => { setMonthsAgo(Number(ev.target.value)); setStatus(""); }} className={control}>
            {monthLabels.map((label, ago) => <option key={ago} value={ago}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="monthly-views" className="text-[13px] font-medium">{t("views")}</label>
          <input
            id="monthly-views" dir="ltr" inputMode="numeric" value={value} placeholder="0" autoComplete="off"
            onChange={(ev) => { setValue(digitsOnly(ev.target.value, 12)); setStatus(""); }}
            className={control}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-navy/5 px-4 py-3" aria-live="polite">
        <span className="text-[13px] text-muted">{value === "" ? t("viewsHidden") : t("shownOnPage")}</span>
        {value !== "" && <span dir="ltr" className="font-numbers text-[22px] font-black">{formatNumber(Number(value), lang)}</span>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "failed" ? "text-bad" : "text-good"}`}>
          {status === "saved" ? e("saved") : status === "failed" ? e("errors.failed") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </Card>
  );
}
