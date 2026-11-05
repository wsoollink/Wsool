"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import type { AgencyRequestField } from "@/lib/validation/agency-request";
import { applyAgency, type ApplyResult } from "./actions";

const EMPTY = { name: "", agencyName: "", email: "", phone: "", note: "", website: "" };
type Text = keyof typeof EMPTY;

/** "Join as an agency" form. Controlled fields, so a failed send keeps what was typed. */
export function ApplyForm({ lang }: { lang: "ar" | "en" }) {
  const t = useTranslations("AgencyApply");
  const [form, setForm] = useState(EMPTY);
  const [newsletter, setNewsletter] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [pending, start] = useTransition();
  const set = (k: Text) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k: AgencyRequestField) => (result && !result.ok && result.error === k ? t(`errors.${k}`) : undefined);

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 py-4">
        <CircleCheck aria-hidden="true" size={40} className="text-good" />
        <p className="text-lg font-bold">{t("sentTitle")}</p>
        <p className="text-sm text-muted">{t("sentBody")}</p>
        <Link href="/agencies" className="text-sm font-bold text-blue">{t("back")}</Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e: FormEvent) => { e.preventDefault(); start(async () => setResult(await applyAgency({ ...form, newsletter }, lang))); }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="ap-name" label={t("name")} autoComplete="name" value={form.name} onChange={set("name")} maxLength={80} required error={err("name")} />
        <TextField id="ap-agency" label={t("agencyName")} autoComplete="organization" value={form.agencyName} onChange={set("agencyName")} maxLength={80} required error={err("agencyName")} />
      </div>
      <TextField id="ap-email" label={t("email")} hint={t("emailHint")} type="email" autoComplete="email" dir="ltr" value={form.email} onChange={set("email")} maxLength={254} required error={err("email")} />
      <TextField id="ap-phone" label={t("phone")} hint={t("phoneHint")} type="tel" autoComplete="tel" dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" value={form.phone} onChange={set("phone")} maxLength={40} required error={err("phone")} />
      <TextAreaField id="ap-note" label={t("note")} rows={4} value={form.note} onChange={set("note")} maxLength={1000} error={err("note")} />
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-blue" />
        <span>{t("newsletter")}</span>
      </label>
      {/* Honeypot: hidden from people, bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="ap-website">Website</label>
        <input id="ap-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>
      {result && !result.ok && (result.error === "rate" || result.error === "failed") && (
        <p role="alert" className="text-sm text-bad">{t(`errors.${result.error}`)}</p>
      )}
      <Button type="submit" disabled={pending} className="self-start">{pending ? t("sending") : t("send")}</Button>
      <p className="text-xs text-muted">{t("privacy")}</p>
    </form>
  );
}
