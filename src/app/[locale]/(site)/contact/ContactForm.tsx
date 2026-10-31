"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { SUPPORT_EMAIL } from "@/config/site";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/validation/support-message";
import { sendSupportMessage, type ContactResult } from "./actions";

const EMPTY = { name: "", email: "", topic: "billing" as ContactTopic, username: "", message: "", website: "" };

/** The "Contact us" form. Controlled fields, so a failed send keeps what was typed (CLAUDE.md, Forms). */
export function ContactForm({ lang }: { lang: "ar" | "en" }) {
  const t = useTranslations("Contact");
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState<ContactResult | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await sendSupportMessage(form, lang);
      setResult(res);
      if (res.ok) setForm(EMPTY);
    });
  }

  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <CircleCheck aria-hidden="true" size={36} className="text-good" />
        <p className="text-base font-semibold">{t("sent")}</p>
        <Button variant="secondary" onClick={() => setResult(null)}>{t("sendAnother")}</Button>
      </div>
    );
  }

  const error = result && !result.ok ? result.error : null;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="c-name" label={t("name")} placeholder={t("namePh")} autoComplete="name" required maxLength={80}
          value={form.name} onChange={set("name")} error={error === "name" ? t("errors.name") : undefined} />
        <TextField id="c-email" label={t("email")} type="email" dir="ltr" placeholder="name@example.com" autoComplete="email" required maxLength={254}
          value={form.email} onChange={set("email")} error={error === "email" ? t("errors.email") : undefined} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-topic" className="text-sm font-medium">{t("topic")}</label>
        <select id="c-topic" value={form.topic} onChange={set("topic")}
          className="min-h-11 w-full rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] text-navy shadow-card outline-none focus:border-blue focus:ring-3 focus:ring-blue/15">
          {CONTACT_TOPICS.map((k) => <option key={k} value={k}>{t(`topics.${k}`)}</option>)}
        </select>
      </div>
      <TextField id="c-username" label={t("username")} dir="ltr" placeholder="wsool.link/…" autoComplete="off" maxLength={60}
        value={form.username} onChange={set("username")} />
      <TextAreaField id="c-message" label={t("message")} placeholder={t("messagePh")} required maxLength={3000} rows={6}
        counter={form.message.length > 2500 ? `${form.message.length}/3000` : undefined}
        value={form.message} onChange={set("message")} error={error === "message" ? t("errors.message") : undefined} />
      {/* Honeypot: hidden from people and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute -start-[9999px] size-px overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>
      {(error === "rate" || error === "failed") && (
        <p role="alert" className="text-sm text-bad">{error === "rate" ? t("errors.rate") : t("errors.failed", { email: SUPPORT_EMAIL })}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">{pending ? t("sending") : t("send")}</Button>
      <p className="text-xs text-muted">
        {t.rich("consent", { privacy: (chunks) => <Link href="/privacy" className="text-blue underline underline-offset-2">{chunks}</Link> })}
      </p>
    </form>
  );
}
