"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MAX_CATEGORIES } from "@/config/categories";
import { saveCategoryList } from "./actions";

type Row = { key: string; id: string | null; nameAr: string; nameEn: string; uses: number };
const newKey = () => Math.random().toString(36).slice(2);
const control = "h-12 w-full min-w-0 rounded-xl border border-navy/16 bg-white px-3 text-[15px]";
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-muted hover:text-navy disabled:opacity-30";

/** Owner's category list: rename (Arabic + English), reorder, add, delete; one save for all. */
export function CategoryEditor({ initial }: { initial: { id: string; nameAr: string; nameEn: string; uses: number }[] }) {
  const t = useTranslations("Admin.categories");
  const [rows, setRows] = useState<Row[]>(initial.map((c) => ({ ...c, key: c.id })));
  const [status, setStatus] = useState<"" | "saved" | "invalid" | "duplicate" | "failed">("");
  const [pending, startTransition] = useTransition();
  const set = (key: string, patch: Partial<Row>) => { setStatus(""); setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r))); };
  const move = (i: number, by: number) => { setStatus(""); setRows((all) => { const next = [...all]; [next[i], next[i + by]] = [next[i + by], next[i]]; return next; }); };
  const remove = (r: Row) => {
    if (r.uses > 0 && !window.confirm(t("confirmDelete", { name: r.nameAr || r.nameEn, n: r.uses }))) return;
    setStatus("");
    setRows((all) => all.filter((x) => x.key !== r.key));
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveCategoryList(rows.map(({ id, nameAr, nameEn }) => ({ id, nameAr, nameEn })));
      if (res.ok && res.items) {
        // Saved in list order, so row i is items[i]; new rows get their ids.
        setRows(res.items.map((c, i) => ({ ...c, key: c.id, uses: rows[i]?.uses ?? 0 })));
        setStatus("saved");
      } else setStatus(res.error ?? "failed");
    });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("title")}</h2>
        <p className="text-xs text-muted">{t("hint", { max: MAX_CATEGORIES })}</p>
      </div>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-2xl bg-navy/[0.025] p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="flex flex-col gap-1 text-xs text-muted">
              <span className="sr-only sm:not-sr-only">{t("nameAr")}</span>
              <input value={r.nameAr} maxLength={40} dir="rtl" lang="ar" aria-label={t("nameArN", { n: i + 1 })} onChange={(e) => set(r.key, { nameAr: e.target.value })} className={control} />
            </label>
            <label className="col-start-1 flex flex-col gap-1 text-xs text-muted sm:col-start-auto">
              <span className="sr-only sm:not-sr-only">{t("nameEn")}</span>
              <input value={r.nameEn} maxLength={40} dir="ltr" lang="en" aria-label={t("nameEnN", { n: i + 1 })} onChange={(e) => set(r.key, { nameEn: e.target.value })} className={control} />
            </label>
            <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-end justify-end gap-1 sm:col-start-3 sm:row-span-1 sm:flex-row sm:items-end">
              <span className="px-1 text-xs whitespace-nowrap text-muted sm:self-center sm:pt-5">{t("uses", { n: r.uses })}</span>
              <div className="flex gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("moveUp", { n: i + 1 })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t("moveDown", { n: i + 1 })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                <button type="button" onClick={() => remove(r)} aria-label={t("delete", { n: i + 1 })} className={`${iconButton} hover:text-bad`}><Trash2 aria-hidden="true" size={16} /></button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {rows.length < MAX_CATEGORIES && (
        <button type="button" onClick={() => { setStatus(""); setRows([...rows, { key: newKey(), id: null, nameAr: "", nameEn: "", uses: 0 }]); }} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-navy/5 px-4 text-[13.5px] font-bold">
          <Plus aria-hidden="true" size={18} /> {t("add")}
        </button>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-navy/8 pt-4">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status && t(`status.${status}`)}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </Card>
  );
}
