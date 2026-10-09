"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { FileText, Plus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { MAX_LICENSES } from "@/lib/validation/profile";
import { saveLicenses, type LicenseInput } from "./actions";

type Row = LicenseInput & { key: string; uploading?: boolean; error?: string };
const newKey = () => Math.random().toString(36).slice(2);

/** Licenses: free-text name (+ English name), number, optional image/PDF file. */
export function LicensesCard({ initial, showEnglish }: { initial: Omit<LicenseInput, "filePath">[]; showEnglish: boolean }) {
  const t = useTranslations("EditPage");
  const [rows, setRows] = useState<Row[]>(initial.map((l) => ({ ...l, filePath: null, key: newKey() })));
  const [status, setStatus] = useState<"" | "saved" | "failed" | "incomplete">("");
  const [pending, startTransition] = useTransition();

  const update = (key: string, patch: Partial<Row>) => {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setStatus("");
  };

  async function attach(key: string, file: File | undefined) {
    if (!file) return;
    update(key, { uploading: true, error: undefined });
    const uploaded = await uploadFile("license", await shrinkImage(file, 2000));
    if ("error" in uploaded) return update(key, { uploading: false, error: t(`uploadErrors.${uploaded.error}`) });
    update(key, { uploading: false, filePath: uploaded.path, fileUrl: null });
  }

  const save = () => {
    if (rows.some((r) => !r.name.trim() || !r.number.trim())) return setStatus("incomplete");
    startTransition(async () => {
      const result = await saveLicenses(rows.map(({ name, nameEn, number, filePath, fileUrl }) => ({ name, nameEn, number, filePath, fileUrl })));
      setStatus(result.ok ? "saved" : "failed");
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("licenses")}</h2>
        <p className="text-xs text-muted">{t("licensesHint")}</p>
      </div>
      {rows.map((row, i) => (
        <LicenseRow key={row.key} row={row} index={i} showEnglish={showEnglish} onChange={(patch) => update(row.key, patch)} onAttach={(f) => attach(row.key, f)}
          onRemove={() => { setRows(rows.filter((r) => r.key !== row.key)); setStatus(""); }} />
      ))}
      {rows.length < MAX_LICENSES && (
        <button type="button" onClick={() => setRows([...rows, { key: newKey(), name: "", nameEn: "", number: "", filePath: null, fileUrl: null }])} className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold">
          <Plus aria-hidden="true" size={18} /> {t("addLicense")}
        </button>
      )}
      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status === "saved" ? t("saved") : status === "incomplete" ? t("licenseIncomplete") : status === "failed" ? t("errors.failed") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending || rows.some((r) => r.uploading)} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </Card>
  );
}

type RowProps = { row: Row; index: number; showEnglish: boolean; onChange: (p: Partial<Row>) => void; onAttach: (f?: File) => void; onRemove: () => void };

function LicenseRow({ row, index, showEnglish, onChange, onAttach, onRemove }: RowProps) {
  const t = useTranslations("EditPage");
  const fileId = useId();
  const hasFile = !!(row.filePath || row.fileUrl);
  return (
    <fieldset className="flex min-w-0 flex-col gap-2 border-t border-navy/6 pt-3 first-of-type:border-0 first-of-type:pt-0">
      <legend className="sr-only">{t("licenseN", { n: index + 1 })}</legend>
      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
        <TextField id={`lic-${row.key}-name`} label={t("licenseName")} placeholder={t("licenseNameHint")} value={row.name} maxLength={60} onChange={(e) => onChange({ name: e.target.value })} />
        <TextField id={`lic-${row.key}-num`} label={t("licenseNumber")} dir="ltr" value={row.number} maxLength={60} onChange={(e) => onChange({ number: e.target.value })} />
      </div>
      {showEnglish && (
        <TextField id={`lic-${row.key}-en`} label={t("licenseNameEn")} dir="ltr" lang="en" value={row.nameEn} maxLength={60} onChange={(e) => onChange({ nameEn: e.target.value })} />
      )}
      <div className="flex gap-2">
        <label htmlFor={fileId} className={`flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${hasFile ? "bg-good/8" : "bg-navy/5"} ${row.uploading ? "pointer-events-none opacity-50" : ""}`}>
          <FileText aria-hidden="true" size={18} className="shrink-0" />
          <span className="flex flex-col">
            <span className="text-[13px] font-medium">{row.uploading ? t("uploading") : hasFile ? t("replaceFile") : t("attachFile")}</span>
            <span className={`text-xs ${hasFile ? "text-good" : "text-muted"}`}>{hasFile ? t("fileAttached") : t("fileTypes")}</span>
          </span>
        </label>
        <input id={fileId} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={row.uploading} onChange={(e) => onAttach(e.target.files?.[0])} />
        {hasFile && !row.uploading && (
          <button type="button" onClick={() => onChange({ filePath: null, fileUrl: null })} className="min-h-12 px-2 text-xs text-muted underline">{t("removeFile")}</button>
        )}
        <button type="button" onClick={onRemove} aria-label={t("removeLicense", { n: index + 1 })} className="inline-flex w-12 shrink-0 items-center justify-center rounded-xl bg-navy/5">
          <Trash2 aria-hidden="true" size={18} />
        </button>
      </div>
      {row.error && <p role="alert" className="text-sm text-bad">{row.error}</p>}
    </fieldset>
  );
}
