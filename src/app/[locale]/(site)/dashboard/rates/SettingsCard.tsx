"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RateSettingsInput } from "@/lib/validation/rates";
import { saveRateSettings } from "./actions";

const option = "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 has-[:checked]:border-blue has-[:checked]:bg-blue/5";

/** How rates are shown: on the page or "on request", in the PDF, currency, VAT. */
export function SettingsCard({ initial, onCurrency }: { initial: RateSettingsInput; onCurrency: (c: "SAR" | "USD") => void }) {
  const t = useTranslations("RatesPage");
  const e = useTranslations("EditPage");
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<RateSettingsInput>) => { setValue({ ...value, ...patch }); setStatus(""); };

  const save = () =>
    startTransition(async () => {
      const res = await saveRateSettings(value);
      setStatus(res.ok ? "saved" : "failed");
      if (res.ok) onCurrency(value.currency);
    });

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-bold">{t("settings")}</h2>
      <label className={option}>
        <input type="checkbox" checked={value.showOnPage} onChange={(ev) => set({ showOnPage: ev.target.checked })} className="size-5 accent-blue" />
        <span className="flex flex-col">
          <span className="text-sm font-medium">{t("showOnPage")}</span>
          <span className="text-xs text-muted">{t("showOnPageHint")}</span>
        </span>
      </label>
      <label className={option}>
        <input type="checkbox" checked={value.showInPdf} onChange={(ev) => set({ showInPdf: ev.target.checked })} className="size-5 accent-blue" />
        <span className="text-sm font-medium">{t("showInPdf")}</span>
      </label>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">{t("currency")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["SAR", "USD"] as const).map((c) => (
            <label key={c} className={option}>
              <input type="radio" name="currency" checked={value.currency === c} onChange={() => set({ currency: c })} className="size-5 accent-blue" />
              <span className="text-sm font-medium">{t(c)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">{t("vat")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {([true, false] as const).map((v) => (
            <label key={String(v)} className={option}>
              <input type="radio" name="vat" checked={value.vatIncluded === v} onChange={() => set({ vatIncluded: v })} className="size-5 accent-blue" />
              <span className="text-sm font-medium">{v ? t("vatIncluded") : t("vatExcluded")}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
