"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import { formatPercent, formatPrice } from "@/lib/format";
import { bundleComparison } from "@/lib/rates";
import { MAX_BUNDLES, type RateSettingsInput } from "@/lib/validation/rates";
import { saveBundles, saveRates } from "./actions";
import { emptyRate, newKey, RateList, rateValid, toInput, type RateRow } from "./RateList";
import { SettingsCard } from "./SettingsCard";

type SavedRate = { name: string; nameEn: string | null; price: number };
export type RatesAccount = { id: string; platform: Platform; handle: string; rates: SavedRate[] };
export type RatesBundle = { name: string; nameEn: string; accountIds: string[]; rates: SavedRate[] };
type Lang = { primary: "ar" | "en"; showEnglish: boolean };

const toRows = (rates: SavedRate[]): RateRow[] =>
  rates.map((r) => ({ key: newKey(), name: r.name, nameEn: r.nameEn ?? "", price: String(r.price) }));
const control = "min-h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-base";

type Status = "" | "saved" | "failed" | "incomplete";
function StatusLine({ status, incomplete }: { status: Status; incomplete: string }) {
  const e = useTranslations("EditPage");
  return (
    <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
      {status === "saved" ? e("saved") : status === "failed" ? e("errors.failed") : status === "incomplete" ? incomplete : ""}
    </p>
  );
}

/** The whole Ad rates section; the currency picked in settings is shown on every price field. */
export function RatesEditor({ settings, accounts, bundles, lang }: { settings: RateSettingsInput; accounts: RatesAccount[]; bundles: RatesBundle[]; lang: Lang }) {
  const t = useTranslations("RatesPage");
  const [currency, setCurrency] = useState(settings.currency);
  // Saved account rates, for the bundle "instead of" preview.
  const [saved, setSaved] = useState(accounts);

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard initial={settings} onCurrency={setCurrency} />
      {accounts.length === 0 ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">{t("needAccounts")}</p>
          <Link href="/dashboard/accounts" className={buttonClasses("secondary")}>{t("goToAccounts")}</Link>
        </Card>
      ) : (
        <>
          {accounts.map((a) => (
            <AccountRates
              key={a.id} account={a} lang={lang} currency={t(currency)}
              onSaved={(rates) => setSaved((all) => all.map((x) => (x.id === a.id ? { ...x, rates } : x)))}
            />
          ))}
          <BundlesCard initial={bundles} accounts={saved} lang={lang} currency={currency} />
        </>
      )}
    </div>
  );
}

function AccountRates({ account, lang, currency, onSaved }: { account: RatesAccount; lang: Lang; currency: string; onSaved: (r: SavedRate[]) => void }) {
  const t = useTranslations("RatesPage");
  const e = useTranslations("EditPage");
  const [rows, setRows] = useState(toRows(account.rates));
  const [status, setStatus] = useState<Status>("");
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!rows.every(rateValid)) {
      setRows(rows.map((r) => ({ ...r, error: !rateValid(r) })));
      return setStatus("incomplete");
    }
    startTransition(async () => {
      const res = await saveRates(account.id, rows.map(toInput));
      setStatus(res.ok ? "saved" : "failed");
      if (res.ok) onSaved(rows.map((r) => ({ name: r.name.trim(), nameEn: r.nameEn.trim() || null, price: Number(r.price) })));
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-bold">
        <PlatformIcon platform={account.platform} /> {PLATFORM_NAMES[account.platform]}
        <span dir="ltr" className="truncate text-sm font-normal text-muted">@{account.handle}</span>
      </h2>
      <RateList id={`acc-${account.id}`} rows={rows} onChange={(r) => { setRows(r); setStatus(""); }} showEnglish={lang.showEnglish} primary={lang.primary} currency={currency} />
      <div className="flex items-center justify-between gap-3">
        <StatusLine status={status} incomplete={t("rateIncomplete")} />
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </Card>
  );
}

type BundleRow = { key: string; name: string; nameEn: string; accountIds: string[]; rates: RateRow[]; error?: boolean };

function BundlesCard({ initial, accounts, lang, currency }: { initial: RatesBundle[]; accounts: RatesAccount[]; lang: Lang; currency: "SAR" | "USD" }) {
  const t = useTranslations("RatesPage");
  const e = useTranslations("EditPage");
  const locale = useLocale().slice(0, 2) as Locale;
  const [rows, setRows] = useState<BundleRow[]>(
    initial.map((b) => ({ key: newKey(), name: b.name, nameEn: b.nameEn, accountIds: b.accountIds, rates: toRows(b.rates) })),
  );
  const [status, setStatus] = useState<Status>("");
  const [pending, startTransition] = useTransition();
  const update = (key: string, patch: Partial<BundleRow>) => {
    setRows((all) => all.map((b) => (b.key === key ? { ...b, ...patch, error: false } : b)));
    setStatus("");
  };
  const bundleValid = (b: BundleRow) => b.accountIds.length >= 2 && b.rates.length > 0 && b.rates.every(rateValid);

  const save = () => {
    if (!rows.every(bundleValid)) {
      setRows(rows.map((b) => ({ ...b, error: !bundleValid(b), rates: b.rates.map((r) => ({ ...r, error: !rateValid(r) })) })));
      return setStatus("incomplete");
    }
    startTransition(async () => {
      const res = await saveBundles(rows.map((b) => ({ name: b.name, nameEn: b.nameEn, accountIds: b.accountIds, rates: b.rates.map(toInput) })));
      setStatus(res.ok ? "saved" : "failed");
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("bundles")}</h2>
        <p className="text-xs text-muted">{t("bundlesHint")}</p>
      </div>
      {accounts.length < 2 ? (
        <p className="text-sm text-muted">{t("bundleNeedsTwo")}</p>
      ) : (
        <>
          {rows.map((b, i) => (
            <fieldset key={b.key} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line p-3">
              <legend className="px-1 text-sm font-medium">{t("bundleN", { n: i + 1 })}</legend>
              <div className={`grid gap-3 ${lang.showEnglish ? "sm:grid-cols-2" : ""}`}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`bundle-${b.key}-name`} className="text-sm font-medium">{t("bundleName")}</label>
                  <input id={`bundle-${b.key}-name`} value={b.name} maxLength={40} dir={lang.primary === "ar" ? "rtl" : "ltr"} lang={lang.primary} placeholder={t("bundleNamePlaceholder")} onChange={(ev) => update(b.key, { name: ev.target.value })} className={control} />
                </div>
                {lang.showEnglish && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`bundle-${b.key}-en`} className="text-sm font-medium">{t("bundleNameEn")}</label>
                    <input id={`bundle-${b.key}-en`} value={b.nameEn} maxLength={40} dir="ltr" lang="en" placeholder="e.g. TikTok + Snapchat" onChange={(ev) => update(b.key, { nameEn: ev.target.value })} className={control} />
                  </div>
                )}
              </div>

              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">{t("bundlePlatforms")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {accounts.map((a) => (
                    <label key={a.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 has-[:checked]:border-blue has-[:checked]:bg-blue/5">
                      <input
                        type="checkbox" className="size-5 accent-blue" checked={b.accountIds.includes(a.id)}
                        onChange={(ev) => update(b.key, { accountIds: ev.target.checked ? [...b.accountIds, a.id] : b.accountIds.filter((id) => id !== a.id) })}
                      />
                      <PlatformIcon platform={a.platform} size={18} />
                      <span className="text-sm">{PLATFORM_NAMES[a.platform]}</span>
                      <span dir="ltr" className="truncate text-xs text-muted">@{a.handle}</span>
                    </label>
                  ))}
                </div>
                {b.error && b.accountIds.length < 2 && <p className="text-sm text-bad">{t("bundlePickTwo")}</p>}
              </fieldset>

              <RateList
                id={`bundle-${b.key}`} rows={b.rates} onChange={(r) => update(b.key, { rates: r })}
                showEnglish={lang.showEnglish} primary={lang.primary} currency={t(currency)}
                note={(r) => {
                  if (!rateValid(r)) return null;
                  const c = bundleComparison({ name: r.name, nameEn: null, price: Number(r.price) }, b.accountIds, accounts);
                  return c ? (
                    <span className="text-xs text-good">
                      {t("comparison", { price: formatPrice(c.separate, currency, locale), percent: formatPercent(c.savingsPercent, locale) })}
                    </span>
                  ) : b.accountIds.length >= 2 ? (
                    <span className="text-xs text-muted">{t("noComparison")}</span>
                  ) : null;
                }}
              />

              <button type="button" onClick={() => { setRows(rows.filter((x) => x.key !== b.key)); setStatus(""); }} className={buttonClasses("secondary", "self-end text-bad")}>
                <Trash2 aria-hidden="true" size={16} /> {t("removeBundle", { n: i + 1 })}
              </button>
            </fieldset>
          ))}
          {rows.length < MAX_BUNDLES && (
            <button
              type="button"
              onClick={() => { setRows([...rows, { key: newKey(), name: "", nameEn: "", accountIds: [], rates: [emptyRate()] }]); setStatus(""); }}
              className={buttonClasses("secondary", "self-start")}
            >
              <Plus aria-hidden="true" size={18} /> {t("addBundle")}
            </button>
          )}
          <div className="flex items-center justify-between gap-3">
            <StatusLine status={status} incomplete={t("bundleIncomplete")} />
            <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
              {pending ? e("saving") : e("save")}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
