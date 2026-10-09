"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
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
  return (
    <Card className="flex flex-col gap-1">
      <h2 className="mb-1 font-bold">{t("emailSettings")}</h2>
      <Switch checked={value.reminders} onChange={(v) => toggle({ reminders: v })} label={t("reminders")} hint={t("remindersHint")} />
      <Switch checked={value.productNews} onChange={(v) => toggle({ productNews: v })} label={t("productNews")} hint={t("productNewsHint")} />
      <Switch checked disabled onChange={() => {}} label={t("billingEmails")} hint={t("billingEmailsHint")} />
      <p className="text-xs text-muted">{t("alwaysSent")}</p>
      <p role="status" className="text-sm text-good">{saved ? t("saved") : ""}</p>
    </Card>
  );
}
