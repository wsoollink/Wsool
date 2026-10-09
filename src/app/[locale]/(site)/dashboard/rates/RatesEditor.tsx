"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Layers } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { SaveBar } from "@/components/dashboard/SaveBar";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { fromIntlLocale } from "@/i18n/config";
import { currencyLabel, formatAmount, formatPercent } from "@/lib/format";
import { bundleComparison } from "@/lib/rates";
import { RATE_CURRENCIES, type RateSettingsInput } from "@/lib/validation/rates";
import { saveBundles, saveRates, saveRateSettings } from "./actions";
import { emptyRate, newKey, RateList, rateValid, toInput, type RateRow } from "./RateList";

type SavedRate = { name: string; nameEn: string | null; price: number };
export type RatesAccount = { id: string; platform: Platform; handle: string; rates: SavedRate[] };
export type RatesBundle = { name: string; nameEn: string; accountIds: string[]; rates: SavedRate[] };
type Lang = { primary: "ar" | "en"; showEnglish: boolean };

const toRows = (rates: SavedRate[]): RateRow[] =>
  rates.map((r) => ({ key: newKey(), name: r.name, nameEn: r.nameEn ?? "", price: String(r.price) }));
const select = "h-12 w-full rounded-xl border border-navy/16 bg-white px-3 text-[15px]";

type PlatformState = { on: boolean; rows: RateRow[] };
type BundleState = { on: boolean; name: string; nameEn: string; accountIds: string[]; rows: RateRow[]; error?: boolean };

/**
 * The Ad rates section from the design: settings with switches, one card per
 * platform (switch + rate types), one optional bundle, and a single sticky
 * Save button that saves everything.
 */
export function RatesEditor({ settings, accounts, bundle, lang }: { settings: RateSettingsInput; accounts: RatesAccount[]; bundle: RatesBundle | null; lang: Lang }) {
  const t = useTranslations("RatesPage");
  const locale = fromIntlLocale(useLocale());
  const [value, setValue] = useState(settings);
  const [platforms, setPlatforms] = useState<Record<string, PlatformState>>(
    Object.fromEntries(accounts.map((a) => [a.id, { on: a.rates.length > 0, rows: a.rates.length ? toRows(a.rates) : [emptyRate()] }])),
  );
  const [b, setB] = useState<BundleState>({
    on: !!bundle, name: bundle?.name ?? "", nameEn: bundle?.nameEn ?? "",
    accountIds: bundle?.accountIds ?? [], rows: bundle ? toRows(bundle.rates) : [emptyRate()],
  });
  const [status, setStatus] = useState<"" | "saved" | "failed" | "incomplete">("");
  const [pending, startTransition] = useTransition();
  const dirty = () => setStatus("");
  const cur = currencyLabel(value.currency, locale);

  // Live rates (what's typed now) for the bundle "instead of" preview.
  const live = accounts.map((a) => ({
    id: a.id,
    rates: platforms[a.id].on ? platforms[a.id].rows.filter(rateValid).map((r) => ({ name: r.name, nameEn: null, price: Number(r.price) })) : [],
  }));

  const save = () => {
    const rowsOk = accounts.every((a) => !platforms[a.id].on || platforms[a.id].rows.every(rateValid));
    const bundleOk = !b.on || (b.accountIds.length >= 2 && b.rows.length > 0 && b.rows.every(rateValid));
    if (!rowsOk || !bundleOk) {
      setPlatforms((all) => Object.fromEntries(Object.entries(all).map(([id, p]) => [id, { ...p, rows: p.rows.map((r) => ({ ...r, error: p.on && !rateValid(r) })) }])));
      setB((x) => ({ ...x, error: !bundleOk, rows: x.rows.map((r) => ({ ...r, error: x.on && !rateValid(r) })) }));
      return setStatus("incomplete");
    }
    startTransition(async () => {
      const results = await Promise.all([
        saveRateSettings(value),
        ...accounts.map((a) => saveRates(a.id, platforms[a.id].on ? platforms[a.id].rows.map(toInput) : [])),
      ]);
      // Bundles last: they compare against the saved account rates.
      const bundleRes = await saveBundles(b.on ? [{ name: b.name, nameEn: b.nameEn, accountIds: b.accountIds, rates: b.rows.map(toInput) }] : []);
      setStatus([...results, bundleRes].every((r) => r.ok) ? "saved" : "failed");
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-0">
      <Card className="flex flex-col gap-2">
        <Switch
          checked={value.showOnPage} onChange={(v) => { setValue({ ...value, showOnPage: v }); dirty(); }}
          label={t("showOnPage")} hint={value.showOnPage ? t("showOnPageOn") : t("showOnPageHint")}
        />
        <Switch
          checked={value.showInPdf} onChange={(v) => { setValue({ ...value, showInPdf: v }); dirty(); }}
          label={t("showInPdf")} hint={t("showInPdfHint")}
        />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rates-currency" className="text-[13px] font-medium">{t("currency")}</label>
            <select id="rates-currency" value={value.currency} onChange={(ev) => { setValue({ ...value, currency: ev.target.value as RateSettingsInput["currency"] }); dirty(); }} className={select}>
              {RATE_CURRENCIES.map((c) => <option key={c} value={c}>{t(`currencies.${c}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rates-vat" className="text-[13px] font-medium">{t("vat")}</label>
            <select id="rates-vat" value={value.vatIncluded ? "1" : "0"} onChange={(ev) => { setValue({ ...value, vatIncluded: ev.target.value === "1" }); dirty(); }} className={select}>
              <option value="0">{t("vatExcluded")}</option>
              <option value="1">{t("vatIncluded")}</option>
            </select>
          </div>
        </div>
      </Card>

      {accounts.length === 0 ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">{t("needAccounts")}</p>
          <Link href="/dashboard/accounts" className={buttonClasses("secondary")}>{t("goToAccounts")}</Link>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="font-bold">{t("perPlatform")}</h2>
              <p className="text-xs text-muted">{t("perPlatformHint")}</p>
            </div>
            {accounts.map((a) => {
              const p = platforms[a.id];
              const valid = p.rows.filter(rateValid);
              const summary = !p.on ? t("off") : valid.length ? t("ratesCount", { count: valid.length }) : t("noRates");
              return (
                <Card key={a.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy/5"><PlatformIcon platform={a.platform} size={18} /></span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-bold">{PLATFORM_NAMES[a.platform]} <span dir="ltr" className="font-normal text-muted">@{a.handle}</span></span>
                      <span className="text-xs text-muted">{summary}</span>
                    </span>
                    <Switch labelHidden label={t("platformRates", { platform: PLATFORM_NAMES[a.platform] })} checked={p.on} onChange={(on) => { setPlatforms({ ...platforms, [a.id]: { ...p, on } }); dirty(); }} />
                  </div>
                  {p.on && (
                    <RateList
                      id={`acc-${a.id}`} rows={p.rows} currency={cur} showEnglish={lang.showEnglish} primary={lang.primary}
                      onChange={(rows) => { setPlatforms({ ...platforms, [a.id]: { ...p, rows } }); dirty(); }}
                    />
                  )}
                </Card>
              );
            })}
          </section>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5"><Layers aria-hidden="true" size={20} /></span>
              <span className="flex flex-1 flex-col">
                <h2 className="font-bold">{t("bundle")}</h2>
                <span className="text-xs text-muted">{t("bundleHint")}</span>
              </span>
              <Switch labelHidden label={t("bundle")} checked={b.on} disabled={accounts.length < 2} onChange={(on) => { setB({ ...b, on }); dirty(); }} />
            </div>
            {accounts.length < 2 && <p className="text-sm text-muted">{t("bundleNeedsTwo")}</p>}
            {b.on && accounts.length >= 2 && (
              <div className="flex flex-col gap-3">
                <div className={`grid gap-3 ${lang.showEnglish ? "sm:grid-cols-2" : ""}`}>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="bundle-name" className="text-[13px] font-medium">{t("bundleName")}</label>
                    <input id="bundle-name" value={b.name} maxLength={40} dir={lang.primary === "ar" ? "rtl" : "ltr"} lang={lang.primary} placeholder={t("bundleNamePlaceholder")} onChange={(ev) => { setB({ ...b, name: ev.target.value }); dirty(); }} className={select} />
                  </div>
                  {lang.showEnglish && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="bundle-name-en" className="text-[13px] font-medium">{t("bundleNameEn")}</label>
                      <input id="bundle-name-en" value={b.nameEn} maxLength={40} dir="ltr" lang="en" placeholder="All-in bundle" onChange={(ev) => { setB({ ...b, nameEn: ev.target.value }); dirty(); }} className={select} />
                    </div>
                  )}
                </div>
                <fieldset className="flex min-w-0 flex-col gap-2">
                  <legend className="mb-2 text-[13px] font-medium">{t("bundlePlatforms")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((a) => {
                      const checked = b.accountIds.includes(a.id);
                      return (
                        <button
                          key={a.id} type="button" role="checkbox" aria-checked={checked}
                          onClick={() => { setB({ ...b, accountIds: checked ? b.accountIds.filter((id) => id !== a.id) : [...b.accountIds, a.id] }); dirty(); }}
                          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium ${checked ? "border-blue bg-blue/8" : "border-navy/10 bg-white"}`}
                        >
                          <PlatformIcon platform={a.platform} size={16} /> {PLATFORM_NAMES[a.platform]}
                        </button>
                      );
                    })}
                  </div>
                  {b.error && b.accountIds.length < 2 && <p className="text-sm text-bad">{t("bundlePickTwo")}</p>}
                </fieldset>
                <RateList
                  id="bundle" rows={b.rows} currency={cur} showEnglish={lang.showEnglish} primary={lang.primary}
                  onChange={(rows) => { setB({ ...b, rows }); dirty(); }}
                  note={(r) => {
                    if (!rateValid(r)) return null;
                    const c = bundleComparison({ name: r.name, nameEn: null, price: Number(r.price) }, b.accountIds, live);
                    return c ? (
                      <span className="text-xs text-good">{t("comparison", { price: `${formatAmount(c.separate, locale)} ${cur}`, percent: formatPercent(c.savingsPercent, locale) })}</span>
                    ) : b.accountIds.length >= 2 ? (
                      <span className="text-xs text-muted">{t("noComparison")}</span>
                    ) : null;
                  }}
                />
              </div>
            )}
          </Card>
        </>
      )}

      <SaveBar
        onSave={save} pending={pending}
        status={status === "incomplete" ? { tone: "bad", text: t("rateIncomplete") } : status === "failed" ? { tone: "bad", text: t("failed") } : status === "saved" ? { tone: "good", text: t("saved") } : null}
      />
    </div>
  );
}
