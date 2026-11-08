"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ClipboardPaste, Copy, Download, FileUp, Plus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { codesCsv, parsePeopleList } from "@/lib/people-list";
import { createCodes, deleteRevoked, revokeCode, type CreateResult } from "./actions";

type Row = { key: string; note: string; email: string };
const newKey = () => Math.random().toString(36).slice(2);
const control = "h-11 w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none shadow-card transition-[border-color,box-shadow] focus:border-blue focus:ring-3 focus:ring-blue/15";
const PRESETS = [10, 20, 30, 50, 100];

/** Form: percent + one row per person (name/note, optional email lock); then the new codes with copy buttons. */
export function CreateCodes({ limits }: { limits: { min: number; max: number; batch: number; days: number } }) {
  const t = useTranslations("Admin.discounts");
  const router = useRouter();
  const [percent, setPercent] = useState("20");
  const [freeCycle, setFreeCycle] = useState<"monthly" | "yearly">("yearly");
  const free = percent === "100";
  const [audience, setAudience] = useState<"creators" | "agencies">("creators");
  const [freePlan, setFreePlan] = useState<"starter" | "growth">("starter");
  const [mode, setMode] = useState<"count" | "people">("count");
  const [count, setCount] = useState("10");
  const [countNote, setCountNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ key: newKey(), note: "", email: "" }]);
  const n = mode === "count" ? Math.min(Number(count) || 0, limits.batch) : rows.length;
  const [result, setResult] = useState<CreateResult["codes"] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const [imported, setImported] = useState<string>("");

  /** Adds people from a pasted list or a .txt/.csv file (one per line: name, email, or "name, email"). */
  const importList = (text: string) => {
    const blank = rows.length === 1 && !rows[0].note && !rows[0].email;
    const keep = blank ? [] : rows;
    const { rows: found, duplicates, overLimit } = parsePeopleList(text, limits.batch - keep.length);
    const next = [...keep, ...found.map((r) => ({ key: newKey(), ...r }))];
    setRows(next.length ? next : [{ key: newKey(), note: "", email: "" }]);
    setImported([t("import.added", { n: found.length }), duplicates ? t("import.duplicates", { n: duplicates }) : "", overLimit ? t("import.overLimit", { n: overLimit, max: limits.batch }) : ""].filter(Boolean).join(" · "));
    setPaste(null);
  };
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1_000_000) return setImported(t("import.tooBig"));
    importList(await f.text());
  };
  const downloadCsv = (codes: NonNullable<CreateResult["codes"]>) => {
    const blob = new Blob([codesCsv(codes, [t("import.csvName"), t("import.csvCode"), t("import.csvEmail")])], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wsool-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const set = (key: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const list = mode === "count" ? Array.from({ length: n }, () => ({ note: countNote, email: "" })) : rows.map(({ note, email }) => ({ note, email }));
      const res = await createCodes({ percent: Number(percent), audience, ...(free && { freeCycle }), ...(free && audience === "agencies" && { freePlan }), rows: list });
      if (res.codes) {
        setResult(res.codes);
        setRows([{ key: newKey(), note: "", email: "" }]);
        setImported("");
        router.refresh();
      } else setError(t(`errors.${res.error ?? "failed"}`));
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("createTitle")}</h2>
        <p className="text-xs text-muted">{t("createHint", { days: limits.days })}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium">{t("audience")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["creators", "agencies"] as const).map((a) => (
              <button key={a} type="button" aria-pressed={audience === a} onClick={() => setAudience(a)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${audience === a ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted shadow-card ring-1 ring-line hover:text-navy"}`}>
                {t(a === "creators" ? "audienceCreators" : "audienceAgencies")}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">{t("audienceHint")}</p>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium">{t("percent")}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={percent === String(p)} onClick={() => setPercent(String(p))} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${percent === String(p) ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted shadow-card ring-1 ring-line hover:text-navy"}`}>
                {p === 100 ? t("freePreset") : `${p}%`}
              </button>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">{t("other")}</span>
              <input
                type="text" inputMode="numeric" dir="ltr" value={percent} aria-label={t("percent")}
                onChange={(e) => setPercent(e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/\D/g, "").slice(0, 3))}
                className="h-11 w-20 rounded-[10px] border border-navy/15 bg-card px-3 text-center text-[15px] outline-none shadow-card transition-[border-color,box-shadow] focus:border-blue focus:ring-3 focus:ring-blue/15"
              />
              <span>%</span>
            </label>
          </div>
          <p className="text-xs text-muted">{t("percentHint", { min: limits.min, max: limits.max })}</p>
        </fieldset>

        {free && (
          <fieldset className="flex flex-col gap-2 rounded-2xl bg-good/8 p-3">
            <legend className="sr-only">{t("freeCycle")}</legend>
            {audience === "agencies" && (
              <>
                <p className="text-[13px] font-bold">{t("freePlan")}</p>
                <div className="flex flex-wrap gap-2">
                  {(["starter", "growth"] as const).map((p) => (
                    <button key={p} type="button" aria-pressed={freePlan === p} onClick={() => setFreePlan(p)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${freePlan === p ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted shadow-card ring-1 ring-line hover:text-navy"}`}>
                      {t(`agencyPlans.${p}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="text-[13px] font-bold">{t("freeCycle")}</p>
            <div className="flex flex-wrap gap-2">
              {(["monthly", "yearly"] as const).map((c) => (
                <button key={c} type="button" aria-pressed={freeCycle === c} onClick={() => setFreeCycle(c)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${freeCycle === c ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted shadow-card ring-1 ring-line hover:text-navy"}`}>
                  {t(`cycle.${c}`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">{t(audience === "agencies" ? "freeHintAgency" : "freeHint")}</p>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium">{t("mode")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["count", "people"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${mode === m ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted shadow-card ring-1 ring-line hover:text-navy"}`}>
                {t(m === "count" ? "modeCount" : "modePeople")}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === "count" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code-count" className="text-[13px] font-medium">{t("count")}</label>
              <input
                id="code-count" type="text" inputMode="numeric" dir="ltr" value={count}
                onChange={(e) => setCount(e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/\D/g, "").slice(0, 3))}
                className={`${control} text-center`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code-note" className="text-[13px] font-medium">{t("countNote")}</label>
              <input id="code-note" value={countNote} maxLength={120} placeholder={t("countNotePh")} onChange={(e) => setCountNote(e.target.value)} className={control} />
            </div>
            <p className="text-xs text-muted sm:col-span-2">{t("countHint", { max: limits.batch })}</p>
          </div>
        ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium">{t("people")}</p>
          <div className="flex flex-col gap-2 rounded-xl bg-navy/[0.03] p-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13.5px] font-bold shadow-card hover:bg-hover">
                <FileUp aria-hidden="true" size={17} /> {t("import.file")}
              </button>
              <button type="button" aria-expanded={paste !== null} onClick={() => setPaste(paste === null ? "" : null)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13.5px] font-bold shadow-card hover:bg-hover">
                <ClipboardPaste aria-hidden="true" size={17} /> {t("import.paste")}
              </button>
              <input ref={fileInput} type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <p className="text-xs text-muted">{t("import.hint", { max: limits.batch })}</p>
            {paste !== null && (
              <div className="flex flex-col gap-2">
                <label htmlFor="people-paste" className="sr-only">{t("import.paste")}</label>
                <textarea id="people-paste" autoFocus value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} placeholder={t("import.placeholder")} className={`${control} h-auto py-2.5 leading-7`} />
                <button type="button" disabled={!paste.trim()} onClick={() => importList(paste)} className={buttonClasses("secondary", "self-start")}>{t("import.add")}</button>
              </div>
            )}
            {imported && <p role="status" className="text-[13px] font-bold text-good">{imported}</p>}
          </div>
          <ul className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <li key={r.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="sr-only" htmlFor={`note-${r.key}`}>{t("noteN", { n: i + 1 })}</label>
                <input id={`note-${r.key}`} value={r.note} maxLength={120} placeholder={t("notePh")} onChange={(e) => set(r.key, { note: e.target.value })} className={control} />
                <label className="sr-only" htmlFor={`email-${r.key}`}>{t("emailN", { n: i + 1 })}</label>
                <input id={`email-${r.key}`} type="email" dir="ltr" value={r.email} maxLength={254} placeholder={t("emailPh")} onChange={(e) => set(r.key, { email: e.target.value })} className={control} />
                <button
                  type="button" disabled={rows.length === 1} onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                  aria-label={t("removeRow", { n: i + 1 })} className="inline-flex size-12 items-center justify-center rounded-xl bg-navy/5 text-muted disabled:opacity-30"
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t("emailHint")}</p>
          {rows.length < limits.batch && (
            <button type="button" onClick={() => setRows([...rows, { key: newKey(), note: "", email: "" }])} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-line bg-card shadow-card hover:bg-hover px-4 text-[13.5px] font-bold">
              <Plus aria-hidden="true" size={18} /> {t("addPerson")}
            </button>
          )}
        </div>
        )}

        <button type="submit" disabled={pending || n < 1} className={buttonClasses("primary", "self-start")}>
          {pending ? t("creating") : t("create", { n })}
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </form>

      {result && result.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-good/8 p-4" role="status">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-good">{t("created", { n: result.length })}</p>
            <span className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadCsv(result)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-[13px] font-bold">
                <Download aria-hidden="true" size={16} /> {t("import.download")}
              </button>
              <button type="button" onClick={() => copy(result.map((c) => [c.code, c.note, c.email].filter(Boolean).join(" — ")).join("\n"), "all")} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-[13px] font-bold">
                {copied === "all" ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />} {t("copyAll")}
              </button>
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-good/15">
            {result.map((c) => (
              <li key={c.code} className="flex items-center gap-3 py-1.5">
                <code dir="ltr" className="text-[15px] font-bold">{c.code}</code>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{[c.note, c.email].filter(Boolean).join(" · ")}</span>
                <button type="button" onClick={() => copy(c.code, c.code)} aria-label={t("copyCode", { code: c.code })} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-card">
                  {copied === c.code ? <Check aria-hidden="true" size={16} className="text-good" /> : <Copy aria-hidden="true" size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function RevokeButton({ id, code }: { id: string; code: string }) {
  const t = useTranslations("Admin.discounts");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button" disabled={pending}
      onClick={() => {
        if (!window.confirm(t("confirmRevoke", { code }))) return;
        startTransition(async () => { await revokeCode(id); router.refresh(); });
      }}
      className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"
    >
      {t("revoke")}
    </button>
  );
}

/** Deletes one revoked code, or all of them when no id is given (asks first). */
export function DeleteRevokedButton({ id, code, count }: { id: string | null; code?: string; count?: number }) {
  const t = useTranslations("Admin.discounts");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const all = id === null;
  return (
    <button
      type="button" disabled={pending}
      onClick={() => {
        if (!window.confirm(all ? t("confirmDeleteAll", { n: count ?? 0 }) : t("confirmDelete", { code: code ?? "" }))) return;
        startTransition(async () => { await deleteRevoked(id); router.refresh(); });
      }}
      className={all
        ? "inline-flex min-h-11 items-center gap-2 rounded-full bg-bad/8 px-4 text-[13.5px] font-bold text-bad hover:bg-bad/12"
        : "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"}
    >
      <Trash2 aria-hidden="true" size={16} /> {all ? t("deleteAllRevoked", { n: count ?? 0 }) : t("delete")}
    </button>
  );
}
