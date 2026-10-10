"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { digitsOnly, formatPercent } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { AGE_GROUPS, MAX_AUDIENCE_ROWS } from "@/lib/validation/accounts";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { readAudienceShot, saveAudience } from "./actions";

type Share = { label: string; percent: number };
export type AudienceValue = { gender: Share[]; ages: Share[]; countries: Share[]; cities: Share[] };
export type AudienceAccount = { id: string; platform: Platform; handle: string; audience: AudienceValue | null };

/** Countries offered in the picker (Gulf and Arab countries first). */
const COUNTRIES = [
  "SA", "AE", "KW", "QA", "BH", "OM", "EG", "JO", "IQ", "LB", "SY", "PS", "YE", "MA", "DZ", "TN", "LY", "SD",
  "US", "GB", "CA", "DE", "FR", "TR",
];

const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-navy/5";
const control = "min-h-11 rounded-xl border border-line bg-card px-3 text-base";

/** Audience breakdown per account: gender, ages, top countries and cities, in %. */
export function AudienceCard({ accounts }: { accounts: AudienceAccount[] }) {
  const t = useTranslations("AccountsPage");
  return (
    <Card id="audience" className="flex scroll-mt-6 flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("audience")}</h2>
        <p className="text-xs text-muted">{t("audienceHint")}</p>
      </div>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted">{t("audienceNoAccounts")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((a) => (
            <li key={a.id}>
              <details className="group rounded-2xl border border-line">
                <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl px-3 py-2">
                  <PlatformIcon platform={a.platform} className="shrink-0" />
                  <span className="font-medium">{PLATFORM_NAMES[a.platform]}</span>
                  <span dir="ltr" className="truncate text-sm text-muted">@{a.handle}</span>
                  <span className="ms-auto text-xs text-muted">{a.audience ? t("audienceAdded") : t("audienceEmpty")}</span>
                </summary>
                <div className="border-t border-line p-3">
                  <AudienceForm account={a} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type Rows = { label: string; percent: string }[];
const toRows = (list: Share[] | undefined): Rows => (list ?? []).map((s) => ({ label: s.label, percent: String(s.percent) }));
const sum = (rows: Rows) => rows.reduce((total, r) => total + (Number(r.percent) || 0), 0);
const toShares = (rows: Rows) =>
  rows.filter((r) => r.label.trim() && r.percent !== "").map((r) => ({ label: r.label.trim(), percent: Number(r.percent) }));

function AudienceForm({ account }: { account: AudienceAccount }) {
  const t = useTranslations("AccountsPage");
  const e = useTranslations("EditPage");
  const locale = useLocale();
  const lang = locale.slice(0, 2) as Locale;
  const regions = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const fixed = (labels: readonly string[], list: Share[] | undefined): Rows =>
    labels.map((label) => ({ label, percent: String(list?.find((s) => s.label === label)?.percent ?? "") }));

  const [gender, setGender] = useState(fixed(["female", "male"], account.audience?.gender));
  const [ages, setAges] = useState(fixed(AGE_GROUPS, account.audience?.ages));
  const [countries, setCountries] = useState(toRows(account.audience?.countries));
  const [cities, setCities] = useState(toRows(account.audience?.cities));
  const [status, setStatus] = useState<"" | "saved" | "failed" | "over_100">("");
  const [pending, startTransition] = useTransition();
  const shotId = useId();
  const [ai, setAi] = useState<"" | "reading" | "filled" | "off" | "limit" | "not_stats" | "failed">("");
  // Codes the AI found outside the short picker list still show by name.
  const countryOptions = [...COUNTRIES, ...countries.map((r) => r.label).filter((c) => c && !COUNTRIES.includes(c))];

  /** Upload an audience stats screenshot; the AI fills the form, the creator reviews and saves. */
  async function fillFromShot(file: File | undefined) {
    if (!file) return;
    setAi("reading");
    setStatus("");
    const uploaded = await uploadFile("audienceShot", await shrinkImage(file, 1800, 0.9));
    if ("error" in uploaded) return setAi("failed");
    const res = await readAudienceShot(account.id, uploaded.path).catch(() => ({ error: "failed" as const }));
    if (!("audience" in res)) return setAi(res.error);
    const a = res.audience;
    setGender(fixed(["female", "male"], a.gender));
    setAges(fixed(AGE_GROUPS, a.ages));
    setCountries(toRows(a.countries));
    setCities(toRows(a.cities));
    setAi("filled");
  }

  const touch = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setStatus(""); };
  const groups = [gender, ages, countries, cities];
  const over = groups.some((g) => sum(g) > 100);

  const save = () => {
    if (over) return setStatus("over_100");
    startTransition(async () => {
      const res = await saveAudience(account.id, {
        gender: toShares(gender) as { label: "female" | "male"; percent: number }[],
        ages: toShares(ages) as { label: (typeof AGE_GROUPS)[number]; percent: number }[],
        countries: toShares(countries),
        cities: toShares(cities),
      });
      setStatus(res.ok ? "saved" : res.error ?? "failed");
    });
  };

  const total = (rows: Rows) => (
    <span className={`text-xs ${sum(rows) > 100 ? "text-bad" : "text-muted"}`}>{t("sum", { value: formatPercent(sum(rows), lang) })}</span>
  );

  const percentInput = (rows: Rows, set: (r: Rows) => void, i: number, label: string) => (
    <div className="flex items-center gap-1">
      <input
        dir="ltr" inputMode="numeric" value={rows[i].percent} placeholder="0" autoComplete="off"
        aria-label={t("percentOf", { item: label })}
        onChange={(ev) => set(rows.map((r, j) => (j === i ? { ...r, percent: digitsOnly(ev.target.value, 3) } : r)))}
        className={`${control} w-16 px-1 text-center`}
      />
      <span aria-hidden="true" className="text-sm text-muted">%</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-[14px] bg-blue/5 p-3">
        <label htmlFor={shotId} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-full bg-white px-4 text-[13.5px] font-bold text-blue ring-1 ring-blue/20 ${ai === "reading" ? "pointer-events-none opacity-60" : ""}`}>
          <Sparkles aria-hidden="true" size={16} className={ai === "reading" ? "motion-safe:animate-pulse" : ""} /> {ai === "reading" ? t("ai.reading") : t("ai.fill")}
        </label>
        <input id={shotId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={ai === "reading"} onChange={(ev) => { fillFromShot(ev.target.files?.[0]); ev.target.value = ""; }} />
        <p role="status" aria-live="polite" className={`text-xs ${ai === "filled" ? "font-bold text-blue" : ai && ai !== "reading" ? "text-bad" : "text-muted"}`}>
          {ai === "" || ai === "reading" ? t("ai.hint") : t(`ai.${ai}`)}
        </p>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 flex w-full justify-between text-sm font-bold">{t("gender")} {total(gender)}</legend>
        {gender.map((r, i) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span className="text-sm">{t(r.label as "female" | "male")}</span>
            {percentInput(gender, touch(setGender), i, t(r.label as "female" | "male"))}
          </div>
        ))}
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 flex w-full justify-between text-sm font-bold">{t("ages")} {total(ages)}</legend>
        {ages.map((r, i) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span dir="ltr" className="text-sm">{r.label}</span>
            {percentInput(ages, touch(setAges), i, r.label)}
          </div>
        ))}
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 flex w-full justify-between text-sm font-bold">{t("countries")} {total(countries)}</legend>
        {countries.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              aria-label={t("country", { n: i + 1 })} value={r.label}
              onChange={(ev) => touch(setCountries)(countries.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))}
              className={`${control} min-w-0 flex-1`}
            >
              <option value="">{t("chooseCountry")}</option>
              {countryOptions.map((c) => (
                <option key={c} value={c} disabled={c !== r.label && countries.some((x) => x.label === c)} suppressHydrationWarning>{regions.of(c)}</option>
              ))}
            </select>
            {percentInput(countries, touch(setCountries), i, r.label ? (regions.of(r.label) ?? r.label) : t("country", { n: i + 1 }))}
            <button type="button" onClick={() => touch(setCountries)(countries.filter((_, j) => j !== i))} aria-label={e("remove", { item: r.label ? (regions.of(r.label) ?? r.label) : t("country", { n: i + 1 }) })} className={iconButton}>
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
        {countries.length < MAX_AUDIENCE_ROWS && (
          <button type="button" onClick={() => touch(setCountries)([...countries, { label: "", percent: "" }])} className={buttonClasses("secondary", "self-start")}>
            <Plus aria-hidden="true" size={18} /> {t("addCountry")}
          </button>
        )}
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 flex w-full justify-between text-sm font-bold">{t("cities")} {total(cities)}</legend>
        {cities.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              aria-label={t("city", { n: i + 1 })} value={r.label} maxLength={40} placeholder={t("cityPlaceholder")}
              onChange={(ev) => touch(setCities)(cities.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))}
              className={`${control} min-w-0 flex-1`}
            />
            {percentInput(cities, touch(setCities), i, r.label || t("city", { n: i + 1 }))}
            <button type="button" onClick={() => touch(setCities)(cities.filter((_, j) => j !== i))} aria-label={e("remove", { item: r.label || t("city", { n: i + 1 }) })} className={iconButton}>
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
        {cities.length < MAX_AUDIENCE_ROWS && (
          <button type="button" onClick={() => touch(setCities)([...cities, { label: "", percent: "" }])} className={buttonClasses("secondary", "self-start")}>
            <Plus aria-hidden="true" size={18} /> {t("addCity")}
          </button>
        )}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status === "saved" ? e("saved") : status === "over_100" ? t("over100") : status === "failed" ? e("errors.failed") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </div>
  );
}
