"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EXPENSE_CATEGORIES, RECURRENCES } from "@/config/finance";
import { decimalInput } from "@/lib/format";
import { addExpense, deleteExpense } from "./actions";

export type ExpenseRow = { id: string; label: string; amount: string; category: string; recurrence: string; description: string };

const control = "min-h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-base";

/** Manual expenses: add (one-off or recurring) and delete. Each change is in the audit log. */
export function ExpensesCard({ rows, today }: { rows: ExpenseRow[]; today: string }) {
  const t = useTranslations("Finance");
  const router = useRouter();
  const [form, setForm] = useState({ date: today, endDate: "", amount: "", currency: "SAR" as "SAR" | "USD", category: "hosting" as (typeof EXPENSE_CATEGORIES)[number], recurrence: "none" as (typeof RECURRENCES)[number], description: "" });
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setMessage(""); };

  const add = (ev: React.FormEvent) => {
    ev.preventDefault();
    startTransition(async () => {
      const res = await addExpense({ ...form, amount: Number(form.amount), endDate: form.recurrence !== "none" && form.endDate ? form.endDate : null });
      setMessage(res.ok ? t("added") : t("invalid"));
      if (res.ok) { setForm({ ...form, amount: "", description: "" }); router.refresh(); }
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-bold">{t("expensesTitle")}</h2>
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1"><label htmlFor="exp-date" className="text-xs font-medium">{t("date")}</label><input id="exp-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} required className={control} /></div>
        <div className="flex flex-col gap-1"><label htmlFor="exp-amount" className="text-xs font-medium">{t("amount")}</label>
          <div className="flex gap-2">
            <input id="exp-amount" dir="ltr" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: decimalInput(e.target.value) })} required className={control} />
            <select aria-label={t("currency")} value={form.currency} onChange={(e) => set({ currency: e.target.value as "SAR" | "USD" })} className={`${control} w-24`}><option>SAR</option><option>USD</option></select>
          </div>
        </div>
        <div className="flex flex-col gap-1"><label htmlFor="exp-cat" className="text-xs font-medium">{t("category")}</label>
          <select id="exp-cat" value={form.category} onChange={(e) => set({ category: e.target.value as typeof form.category })} className={control}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1"><label htmlFor="exp-rec" className="text-xs font-medium">{t("recurrence")}</label>
          <select id="exp-rec" value={form.recurrence} onChange={(e) => set({ recurrence: e.target.value as typeof form.recurrence })} className={control}>
            {RECURRENCES.map((r) => <option key={r} value={r}>{t(`recurrences.${r}`)}</option>)}
          </select>
        </div>
        {form.recurrence !== "none" && (
          <div className="flex flex-col gap-1"><label htmlFor="exp-end" className="text-xs font-medium">{t("endDate")}</label><input id="exp-end" type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} className={control} /></div>
        )}
        <div className="flex flex-col gap-1 sm:col-span-2"><label htmlFor="exp-desc" className="text-xs font-medium">{t("description")}</label><input id="exp-desc" value={form.description} maxLength={200} onChange={(e) => set({ description: e.target.value })} className={control} /></div>
        <div className="flex items-end gap-3">
          <button type="submit" disabled={pending || !form.amount} className={buttonClasses("primary")}>{t("addExpense")}</button>
          <span role="status" className="text-sm text-good">{message}</span>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t("noExpenses")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                {["date", "category", "recurrence", "description", "amount", ""].map((h) => <th key={h} scope="col" className="p-2 text-start font-medium">{h && t(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="p-2 whitespace-nowrap">{r.label}</td>
                  <td className="p-2">{t(`categories.${r.category as (typeof EXPENSE_CATEGORIES)[number]}`)}</td>
                  <td className="p-2">{t(`recurrences.${r.recurrence as (typeof RECURRENCES)[number]}`)}</td>
                  <td className="p-2 text-muted">{r.description}</td>
                  <td className="p-2 font-medium whitespace-nowrap">{r.amount}</td>
                  <td className="p-2">
                    <button
                      type="button" aria-label={t("deleteExpense", { what: r.description || r.amount })}
                      onClick={() => { if (window.confirm(t("confirmDelete"))) startTransition(async () => { await deleteExpense(r.id); router.refresh(); }); }}
                      className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-navy/5"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
