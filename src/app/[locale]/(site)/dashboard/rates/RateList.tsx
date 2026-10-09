"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { decimalInput } from "@/lib/format";
import { MAX_RATES, RATE_NAME_SUGGESTIONS } from "@/lib/validation/rates";

export type RateRow = { key: string; name: string; nameEn: string; price: string; error?: boolean };

export const newKey = () => Math.random().toString(36).slice(2);
export const emptyRate = (): RateRow => ({ key: newKey(), name: "", nameEn: "", price: "" });
export const rateValid = (r: RateRow) => !!r.name.trim() && r.price !== "" && r.price !== ".";
export const toInput = (r: RateRow) => ({ name: r.name, nameEn: r.nameEn, price: Number(r.price) });

const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-navy/5 disabled:opacity-30";
const control = "h-12 w-full min-w-0 rounded-xl border border-navy/16 bg-white px-3 text-[15px] aria-[invalid=true]:border-bad";

type Props = {
  id: string;
  rows: RateRow[];
  onChange: (rows: RateRow[]) => void;
  /** Arabic page with an English version: ask for the English name too. */
  showEnglish: boolean;
  primary: "ar" | "en";
  /** Short currency label shown inside the price field. */
  currency: string;
  /** Extra line under a rate (bundle comparison). */
  note?: (row: RateRow) => ReactNode;
};

/** Rate types as in the design: name, price with the currency inside, delete; then "add". */
export function RateList({ id, rows, onChange, showEnglish, primary, currency, note }: Props) {
  const t = useTranslations("RatesPage");
  const e = useTranslations("EditPage");
  const set = (key: string, patch: Partial<RateRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch, error: false } : r)));
  const move = (i: number, by: number) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const listAr = `${id}-names-ar`, listEn = `${id}-names-en`;

  return (
    <div className="flex flex-col gap-2">
      <datalist id={listAr}>{RATE_NAME_SUGGESTIONS.ar.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id={listEn}>{RATE_NAME_SUGGESTIONS.en.map((n) => <option key={n} value={n} />)}</datalist>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const label = r.name || t("rateN", { n: i + 1 });
          const extra = note?.(r);
          return (
            <li key={r.key} className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-center gap-2">
                <label htmlFor={`${id}-${r.key}-name`} className="sr-only">{t("rateName")}</label>
                <input
                  id={`${id}-${r.key}-name`} list={primary === "ar" ? listAr : listEn} value={r.name} maxLength={40}
                  dir={primary === "ar" ? "rtl" : "ltr"} lang={primary} placeholder={t("rateName")}
                  aria-invalid={r.error && !r.name.trim()} onChange={(ev) => set(r.key, { name: ev.target.value })} className={control}
                />
                <div className="relative">
                  <label htmlFor={`${id}-${r.key}-price`} className="sr-only">{t("price", { currency })}</label>
                  <input
                    id={`${id}-${r.key}-price`} dir="ltr" inputMode="decimal" value={r.price} placeholder="0" autoComplete="off"
                    aria-invalid={r.error && !rateValid({ ...r, name: "x" })} onChange={(ev) => set(r.key, { price: decimalInput(ev.target.value, 11) })}
                    className={`${control} pe-12`}
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{currency}</span>
                </div>
                <button type="button" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} aria-label={e("remove", { item: label })} className={`${iconButton} h-12 bg-navy/5`}>
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
              {showEnglish && (
                <>
                  <label htmlFor={`${id}-${r.key}-en`} className="sr-only">{t("rateNameEn")}</label>
                  <input
                    id={`${id}-${r.key}-en`} list={listEn} value={r.nameEn} maxLength={40} dir="ltr" lang="en" placeholder={t("rateNameEn")}
                    onChange={(ev) => set(r.key, { nameEn: ev.target.value })} className={control}
                  />
                </>
              )}
              {(extra || rows.length > 1) && (
                <div className="flex items-center gap-1">
                  <div className="me-auto">{extra}</div>
                  {rows.length > 1 && (
                    <>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={e("moveUp", { item: label })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={e("moveDown", { item: label })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length < MAX_RATES && (
        <button type="button" onClick={() => onChange([...rows, emptyRate()])} className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-2 text-[13.5px] font-bold">
          <Plus aria-hidden="true" size={18} /> {t("addRate")}
        </button>
      )}
    </div>
  );
}
