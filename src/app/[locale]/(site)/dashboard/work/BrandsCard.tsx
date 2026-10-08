"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UPLOAD_KINDS } from "@/config/uploads";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { MAX_BRANDS } from "@/lib/validation/work";
import { saveBrands } from "./actions";

type Row = { key: string; name: string; path: string | null; url: string | null; preview: string | null; uploading?: boolean; error?: boolean };
const newKey = () => Math.random().toString(36).slice(2);
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-navy/5 disabled:opacity-30";

/** Brand logos: upload, name (used as the image's text alternative), reorder, delete. */
export function BrandsCard({ initial }: { initial: { name: string; url: string }[] }) {
  const t = useTranslations("WorkPage");
  const e = useTranslations("EditPage");
  const fileId = useId();
  const [rows, setRows] = useState<Row[]>(initial.map((b) => ({ key: newKey(), name: b.name, path: null, url: b.url, preview: b.url })));
  const [status, setStatus] = useState<"" | "saved" | "failed" | "incomplete" | "upload">("");
  const [uploadError, setUploadError] = useState("");
  const [pending, startTransition] = useTransition();

  const update = (key: string, patch: Partial<Row>) => {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setStatus("");
  };
  const move = (i: number, by: number) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setRows(next);
    setStatus("");
  };

  async function add(files: FileList | null) {
    setUploadError("");
    for (const file of [...(files ?? [])].slice(0, MAX_BRANDS - rows.length)) {
      const key = newKey();
      setRows((all) => [...all, { key, name: file.name.replace(/\.\w+$/, "").slice(0, 60), path: null, url: null, preview: URL.createObjectURL(file), uploading: true }]);
      const uploaded = await uploadFile("logo", await shrinkImage(file, 800, 0.9, "image/webp"));
      if ("error" in uploaded) {
        setRows((all) => all.filter((r) => r.key !== key));
        setUploadError(e(`uploadErrors.${uploaded.error}`));
      } else {
        update(key, { path: uploaded.path, uploading: false });
      }
    }
  }

  const save = () => {
    if (rows.some((r) => !r.name.trim())) {
      setRows(rows.map((r) => ({ ...r, error: !r.name.trim() })));
      return setStatus("incomplete");
    }
    startTransition(async () => {
      const res = await saveBrands(rows.map((r) => ({ name: r.name, path: r.path, url: r.url })));
      setStatus(res.ok ? "saved" : "failed");
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("brands")}</h2>
        <p className="text-xs text-muted">{t("brandsHint", { max: MAX_BRANDS })}</p>
      </div>

      {rows.length === 0 && <p className="text-sm text-muted">{t("noBrands")}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li key={row.key} className="flex flex-col gap-2 rounded-2xl border border-line p-2">
            <div className="flex items-center gap-2">
              <span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL */}
                {row.preview && <img src={row.preview} alt="" className={`max-h-full max-w-full object-contain p-1 ${row.uploading ? "opacity-40" : ""}`} />}
              </span>
              <label htmlFor={`brand-${row.key}`} className="sr-only">{t("brandName")}</label>
              <input
                id={`brand-${row.key}`} value={row.name} maxLength={60} placeholder={t("brandName")}
                aria-invalid={!!row.error}
                onChange={(ev) => update(row.key, { name: ev.target.value, error: false })}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-base aria-[invalid=true]:border-bad"
              />
            </div>
            <div className="flex items-center justify-end gap-1">
              {row.uploading && <span className="me-auto ps-2 text-xs text-muted">{e("uploading")}</span>}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={e("moveUp", { item: row.name || t("logoN", { n: i + 1 }) })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={e("moveDown", { item: row.name || t("logoN", { n: i + 1 }) })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
              <button type="button" onClick={() => { setRows(rows.filter((r) => r.key !== row.key)); setStatus(""); }} aria-label={e("remove", { item: row.name || t("logoN", { n: i + 1 }) })} className={iconButton}><Trash2 aria-hidden="true" size={16} /></button>
            </div>
          </li>
        ))}
      </ul>

      {rows.length < MAX_BRANDS && (
        <div>
          <label htmlFor={fileId} className={`${buttonClasses("secondary")} cursor-pointer`}>
            <ImagePlus aria-hidden="true" size={18} /> {t("addLogos")}
          </label>
          <input
            id={fileId} type="file" multiple accept={UPLOAD_KINDS.logo.types.join(",")} className="sr-only"
            onChange={(ev) => { add(ev.target.files); ev.target.value = ""; }}
          />
          <p className="mt-1.5 text-xs text-muted">{t("logoHint")}</p>
        </div>
      )}
      {uploadError && <p role="alert" className="text-sm text-bad">{uploadError}</p>}

      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status === "saved" ? e("saved") : status === "incomplete" ? t("brandNameRequired") : status === "failed" ? e("errors.failed") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending || rows.some((r) => r.uploading)} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </Card>
  );
}
