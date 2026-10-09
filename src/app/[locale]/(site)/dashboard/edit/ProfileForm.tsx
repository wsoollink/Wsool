"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
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

  const [tab, setTab] = useState<Locale>(langs[0]);
  const shownTab = langs.includes(tab) ? tab : langs[0];
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries((["ar", "en"] as const).flatMap((l) => [[`${l}.specialty`, texts[l].specialty.length], [`${l}.bio`, texts[l].bio.length]])),
  );
  const count = (key: string) => (e: { currentTarget: { value: string } }) => setCounts((c) => ({ ...c, [key]: e.currentTarget.value.length }));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {langs.length > 1 && (
        <div role="group" aria-label={t("contentLang")} className="grid grid-cols-2 gap-1 rounded-[14px] bg-navy/5 p-1">
          {langs.map((lang) => (
            <button key={lang} type="button" aria-pressed={shownTab === lang} onClick={() => setTab(lang)} className={`h-11 rounded-[10px] text-sm font-bold ${shownTab === lang ? "bg-white text-navy shadow-card" : "text-muted"}`}>
              {lang === "ar" ? t("arabicContent") : "English content"}
            </button>
          ))}
        </div>
      )}

      {/* Both languages stay in the form (one is hidden) so one save sends everything. */}
      {langs.map((lang) => {
        const v = texts[lang];
        const dir = lang === "ar" ? "rtl" : "ltr";
        return (
          <Card key={lang} className={`flex flex-col gap-4 ${shownTab === lang ? "" : "hidden"}`}>
            <h2 className="font-bold">{t("basicInfo")}</h2>
            {/* Labels follow the dashboard language; only the inputs follow the content language. */}
            <div className="flex flex-col gap-4">
              <TextField id={`${lang}.fullName`} name={`${lang}.fullName`} dir={dir} lang={lang} label={t("fullName")} defaultValue={v.fullName} maxLength={80} required error={err(`${lang}.fullName`)} autoComplete="name" />
              <TextField id={`${lang}.specialty`} name={`${lang}.specialty`} dir={dir} lang={lang} label={t("specialty")} defaultValue={v.specialty} maxLength={80} counter={`${counts[`${lang}.specialty`] ?? 0}/80`} onInput={count(`${lang}.specialty`)} hint={t(lang === "ar" ? "specialtyHint" : "specialtyHintEn")} error={err(`${lang}.specialty`)} />
              <TextAreaField id={`${lang}.bio`} name={`${lang}.bio`} dir={dir} lang={lang} label={t("bio")} defaultValue={v.bio} maxLength={500} counter={`${counts[`${lang}.bio`] ?? 0}/500`} onInput={count(`${lang}.bio`)} hint={t("bioHint")} error={err(`${lang}.bio`)} />
              <div className="grid grid-cols-2 gap-3">
                <TextField id={`${lang}.city`} name={`${lang}.city`} dir={dir} lang={lang} label={t("city")} defaultValue={v.city} maxLength={60} error={err(`${lang}.city`)} />
                <TextField id={`${lang}.country`} name={`${lang}.country`} dir={dir} lang={lang} label={t("country")} defaultValue={v.country} maxLength={60} list={`countries-${lang}`} error={err(`${lang}.country`)} />
                <datalist id={`countries-${lang}`}>
                  {(lang === "ar" ? ["السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان", "مصر", "الأردن"] : ["Saudi Arabia", "UAE", "Kuwait", "Qatar", "Bahrain", "Oman", "Egypt", "Jordan"]).map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
          </Card>
        );
      })}

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">{t("language")}</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="primaryLang" className="text-[13px] font-medium">{t("primaryLang")}</label>
          <select id="primaryLang" name="primaryLang" value={primaryLang} onChange={(e) => setPrimaryLang(e.target.value as Locale)} className="h-12 rounded-xl border border-navy/16 bg-white px-3 text-[15px]">
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
          <p className="text-xs text-muted">{t("primaryLangHint")}</p>
        </div>
        {primaryLang === "ar" && (
          <>
            <input type="hidden" name="enEnabled" value={enEnabled ? "on" : ""} disabled={!enEnabled} />
            <Switch checked={enEnabled} onChange={setEnEnabled} label={t("enEnabled")} hint={t("enEnabledHint")} />
          </>
        )}
      </Card>

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
