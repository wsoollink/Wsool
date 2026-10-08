"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Locale } from "@/i18n/config";
import { digitsOnly, formatCompact } from "@/lib/format";
import { saveMonthlyViews } from "./actions";

/** Total monthly views across platforms (the box on the public page). Empty hides it. */
export function ViewsCard({ initial }: { initial: number | null }) {
  const t = useTranslations("AccountsPage");
  const e = useTranslations("EditPage");
  const lang = useLocale().slice(0, 2) as Locale;
  const [value, setValue] = useState(initial === null ? "" : String(initial));
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveMonthlyViews(value === "" ? null : Number(value));
      setStatus(res.ok ? "saved" : "failed");
    });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("monthlyViews")}</h2>
        <p className="text-xs text-muted">{t("monthlyViewsHint")}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="monthly-views" className="text-sm font-medium">{t("views")}</label>
        <input
          id="monthly-views" dir="ltr" inputMode="numeric" value={value} placeholder="0" autoComplete="off"
          aria-describedby="monthly-views-preview"
          onChange={(ev) => { setValue(digitsOnly(ev.target.value, 12)); setStatus(""); }}
          className="min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base"
        />
        <p id="monthly-views-preview" className="text-xs text-muted">
          {value === "" ? t("viewsHidden") : t("viewsPreview", { value: formatCompact(Number(value), lang) })}
        </p>
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
