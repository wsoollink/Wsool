"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { saveEmailSettings } from "./actions";

export function EmailSettings({ initial }: { initial: { reminders: boolean; productNews: boolean } }) {
  const t = useTranslations("Notifications");
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();
  const toggle = (patch: Partial<typeof value>) => {
    const next = { ...value, ...patch };
    setValue(next);
    setSaved(false);
    startTransition(async () => { await saveEmailSettings(next.reminders, next.productNews); setSaved(true); });
  };
  const row = "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line p-3";
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-bold">{t("emailSettings")}</h2>
      <label className={row}>
        <input type="checkbox" checked={value.reminders} onChange={(e) => toggle({ reminders: e.target.checked })} className="mt-0.5 size-5 accent-blue" />
        <span className="flex flex-col"><span className="text-sm font-medium">{t("reminders")}</span><span className="text-xs text-muted">{t("remindersHint")}</span></span>
      </label>
      <label className={row}>
        <input type="checkbox" checked={value.productNews} onChange={(e) => toggle({ productNews: e.target.checked })} className="mt-0.5 size-5 accent-blue" />
        <span className="flex flex-col"><span className="text-sm font-medium">{t("productNews")}</span><span className="text-xs text-muted">{t("productNewsHint")}</span></span>
      </label>
      <p className="text-xs text-muted">{t("alwaysSent")}</p>
      <p role="status" className="text-sm text-good">{saved ? t("saved") : ""}</p>
    </Card>
  );
}
