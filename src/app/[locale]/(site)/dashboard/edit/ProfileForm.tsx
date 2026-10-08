"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextAreaField, TextField } from "@/components/ui/Field";
import type { Locale } from "@/i18n/config";
import { saveProfile, type SaveState } from "./actions";

type Texts = { fullName: string; specialty: string; bio: string; city: string; country: string };
type Props = { primaryLang: Locale; enEnabled: boolean; texts: Record<Locale, Texts> };

export function ProfileForm({ primaryLang: initialPrimary, enEnabled: initialEn, texts }: Props) {
  const t = useTranslations("EditPage");
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProfile, {});
  const [primaryLang, setPrimaryLang] = useState<Locale>(initialPrimary);
  const [enEnabled, setEnEnabled] = useState(initialEn);
  const langs: Locale[] = primaryLang === "ar" ? (enEnabled ? ["ar", "en"] : ["ar"]) : ["en"];
  const err = (key: string) => (state.errors?.[key] ? t(`errors.${state.errors[key]}`) : undefined);

  // Submitting through onSubmit (not the form action) stops React from
  // resetting the fields, so a failed save keeps what the creator typed.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Card className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">{t("primaryLang")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["ar", "en"] as const).map((lang) => (
              <label key={lang} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium ${primaryLang === lang ? "border-blue bg-blue/10 text-blue" : "border-line"}`}>
                <input type="radio" name="primaryLang" value={lang} checked={primaryLang === lang} onChange={() => setPrimaryLang(lang)} className="sr-only" />
                {lang === "ar" ? "العربية" : "English"}
              </label>
            ))}
          </div>
        </fieldset>
        {primaryLang === "ar" && (
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              <span className="block font-medium">{t("enEnabled")}</span>
              <span className="block text-xs text-muted">{t("enEnabledHint")}</span>
            </span>
            <input type="checkbox" name="enEnabled" checked={enEnabled} onChange={(e) => setEnEnabled(e.target.checked)} className="size-5 shrink-0 accent-blue" />
          </label>
        )}
      </Card>

      {langs.map((lang) => {
        const v = texts[lang];
        const dir = lang === "ar" ? "rtl" : "ltr";
        return (
          <Card key={lang} className="flex flex-col gap-4">
            <h2 className="font-bold">{lang === "ar" ? t("arabicContent") : t("englishContent")}</h2>
            {/* Labels follow the dashboard language; only the inputs follow the content language. */}
            <div className="flex flex-col gap-4">
              <TextField id={`${lang}.fullName`} name={`${lang}.fullName`} dir={dir} lang={lang} label={t("fullName")} defaultValue={v.fullName} maxLength={80} required error={err(`${lang}.fullName`)} autoComplete="name" />
              <TextField id={`${lang}.specialty`} name={`${lang}.specialty`} dir={dir} lang={lang} label={t("specialty")} defaultValue={v.specialty} maxLength={80} hint={t(lang === "ar" ? "specialtyHint" : "specialtyHintEn")} error={err(`${lang}.specialty`)} />
              <TextAreaField id={`${lang}.bio`} name={`${lang}.bio`} dir={dir} lang={lang} label={t("bio")} defaultValue={v.bio} maxLength={500} hint={t("bioHint")} error={err(`${lang}.bio`)} />
              <div className="grid grid-cols-2 gap-3">
                <TextField id={`${lang}.city`} name={`${lang}.city`} dir={dir} lang={lang} label={t("city")} defaultValue={v.city} maxLength={60} error={err(`${lang}.city`)} />
                <TextField id={`${lang}.country`} name={`${lang}.country`} dir={dir} lang={lang} label={t("country")} defaultValue={v.country} maxLength={60} error={err(`${lang}.country`)} />
              </div>
            </div>
          </Card>
        );
      })}

      <div className="flex flex-col gap-2">
        <p role="status" aria-live="polite" className={`min-h-5 text-sm ${state.ok ? "text-good" : "text-bad"}`}>
          {state.ok ? t("saved") : state.errors ? t("fixErrors") : state.error ? t(`errors.${state.error}`) : ""}
        </p>
        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClasses("primary", "w-full")}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
