"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UPLOAD_KINDS } from "@/config/uploads";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { MAX_BRANDS } from "@/lib/validation/work";
import { saveBrands } from "./actions";

type Row = { key: string; name: string; path: string | null; url: string | null; preview: string | null; uploading?: boolean };
const newKey = () => Math.random().toString(36).slice(2);
const moveButton = "inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-navy/5 disabled:opacity-30";

/** Brand logos: upload, name (used as the image's text alternative), reorder, delete. */
export function BrandsCard({ initial }: { initial: { name: string; url: string }[] }) {
  const t = useTranslations("WorkPage");
  const e = useTranslations("EditPage");
  const fileId = useId();
  const [rows, setRows] = useState<Row[]>(initial.map((b) => ({ key: newKey(), name: b.name, path: null, url: b.url, preview: b.url })));
  const [status, setStatus] = useState<"" | "saved" | "failed" | "upload">("");
  const [uploadError, setUploadError] = useState("");
  const [pending, startTransition] = useTransition();

  const update = (key: string, patch: Partial<Row>) => {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setStatus("");
  };

  /** Moves a logo one place earlier (-1) or later (+1); the page shows them in this order. */
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
      setRows((all) => [...all, { key, name: "", path: null, url: null, preview: URL.createObjectURL(file), uploading: true }]);
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

      {/* Logo tiles only (owner, Oct 2026: no brand name field; names saved earlier are kept). */}
      <ul className="grid grid-cols-3 gap-2.5">
        {rows.map((row, i) => (
          <li key={row.key} className="flex min-w-0 flex-col gap-1">
            <span className="relative flex h-[72px] items-center justify-center overflow-hidden rounded-[14px] border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL */}
              {row.preview && <img src={row.preview} alt="" className={`max-h-full max-w-full object-contain px-3 py-2.5 ${row.uploading ? "opacity-40" : ""}`} />}
              {row.uploading && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] text-white">{e("uploading")}</span>}
              <button
                type="button" onClick={() => { setRows(rows.filter((r) => r.key !== row.key)); setStatus(""); }}
                aria-label={e("remove", { item: row.name || t("logoN", { n: i + 1 }) })}
                className="absolute end-0.5 top-0.5 inline-flex size-11 items-start justify-end p-1"
              >
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-bg text-muted"><X aria-hidden="true" size={14} /></span>
              </button>
            </span>
            {rows.length > 1 && (
              <div className="flex justify-center">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("moveEarlier", { item: row.name || t("logoN", { n: i + 1 }) })} className={moveButton}>
                  <ChevronRight aria-hidden="true" size={18} className="ltr:rotate-180" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={t("moveLater", { item: row.name || t("logoN", { n: i + 1 }) })} className={moveButton}>
                  <ChevronLeft aria-hidden="true" size={18} className="ltr:rotate-180" />
                </button>
              </div>
            )}
          </li>
        ))}
        {rows.length < MAX_BRANDS && (
          <li>
            <label htmlFor={fileId} className="flex h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-navy/15 text-[12.5px] font-bold">
              <ImagePlus aria-hidden="true" size={18} /> {t("addLogo")}
            </label>
            <input
              id={fileId} type="file" multiple accept={UPLOAD_KINDS.logo.types.join(",")} className="sr-only"
              onChange={(ev) => { add(ev.target.files); ev.target.value = ""; }}
            />
          </li>
        )}
      </ul>
      <p className="text-xs text-muted">{t("logoHint")}</p>
      {uploadError && <p role="alert" className="text-sm text-bad">{uploadError}</p>}

      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status === "saved" ? e("saved") : status === "failed" ? e("errors.failed") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending || rows.some((r) => r.uploading)} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </Card>
  );
}
