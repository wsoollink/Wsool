"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Film, ImageIcon, Play, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES, PLATFORMS } from "@/config/platforms";
import { UPLOAD_KINDS } from "@/config/uploads";
import type { Platform } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import { shrinkImage, uploadFile, videoCover } from "@/lib/upload-client";
import { MAX_WORKS, type FileRef } from "@/lib/validation/work";
import { saveWorks } from "./actions";

type Text = { brand: string; type: string };
export type WorkRow = { platform: Platform | null; videoUrl: string; thumbUrl: string | null; ar: Text; en: Text };
type Row = {
  key: string;
  platform: Platform | null;
  video: FileRef;
  thumb: FileRef;
  /** What the dashboard shows: storage URL or a local preview. */
  cover: string | null;
  ar: Text;
  en: Text;
  uploading?: "video" | "thumb";
};

const newKey = () => Math.random().toString(36).slice(2);
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-navy/5 disabled:opacity-30";
const control = "min-h-11 w-full rounded-xl border border-line bg-card px-3 text-base";
const emptyText = { brand: "", type: "" };

/** Past works: portrait video, optional cover, platform, brand and type per language. */
export function WorksCard({ initial, langs, freeLimit }: { initial: WorkRow[]; langs: Locale[]; freeLimit: number | null }) {
  const t = useTranslations("WorkPage");
  const e = useTranslations("EditPage");
  const fileId = useId();
  const [rows, setRows] = useState<Row[]>(
    initial.map((w) => ({
      key: newKey(), platform: w.platform, video: { path: null, url: w.videoUrl }, thumb: { path: null, url: w.thumbUrl },
      cover: w.thumbUrl, ar: w.ar, en: w.en,
    })),
  );
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
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

  /** Uploads a cover image (picked, or grabbed from the video). */
  async function uploadCover(key: string, image: File) {
    update(key, { uploading: "thumb", cover: URL.createObjectURL(image) });
    const uploaded = await uploadFile("thumb", await shrinkImage(image, 900));
    if ("error" in uploaded) {
      setUploadError(e(`uploadErrors.${uploaded.error}`));
      return update(key, { uploading: undefined, thumb: { path: null, url: null }, cover: null });
    }
    update(key, { uploading: undefined, thumb: { path: uploaded.path, url: null } });
  }

  /** New work (no key) or a replaced video on an existing one. */
  async function uploadVideo(file: File | undefined, existingKey?: string) {
    if (!file) return;
    setUploadError("");
    const key = existingKey ?? newKey();
    if (existingKey) update(key, { uploading: "video" });
    else setRows((all) => [...all, { key, platform: null, video: { path: null, url: null }, thumb: { path: null, url: null }, cover: null, ar: emptyText, en: emptyText, uploading: "video" }]);

    const uploaded = await uploadFile("video", file);
    if ("error" in uploaded) {
      setUploadError(e(`uploadErrors.${uploaded.error}`));
      if (existingKey) update(key, { uploading: undefined });
      else setRows((all) => all.filter((r) => r.key !== key));
      return;
    }
    update(key, { uploading: undefined, video: { path: uploaded.path, url: null } });
    // A new video gets a cover from its first second, unless one was picked.
    const current = rows.find((r) => r.key === key);
    if (!current || (!current.thumb.path && !current.thumb.url)) {
      const cover = await videoCover(file);
      if (cover) await uploadCover(key, cover);
    }
  }

  const save = () =>
    startTransition(async () => {
      const res = await saveWorks(rows.map((r) => ({ platform: r.platform, video: r.video, thumb: r.thumb, ar: r.ar, en: r.en })));
      setStatus(res.ok ? "saved" : "failed");
    });

  const label = (row: Row, i: number) => row.ar.brand || row.en.brand || t("workN", { n: i + 1 });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t("works")}</h2>
        <p className="text-xs text-muted">{t("worksHint", { max: MAX_WORKS })}</p>
      </div>
      {freeLimit !== null && rows.length > freeLimit && (
        <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">{t("freeLimit", { n: freeLimit })}</p>
      )}
      {rows.length === 0 && <p className="text-sm text-muted">{t("noWorks")}</p>}

      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <li key={row.key}>
            <fieldset className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line p-3">
              <legend className="px-1 text-sm font-medium">{t("workN", { n: i + 1 })}</legend>
              <div className="flex gap-3">
                <span className="relative flex aspect-[9/16] w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-navy/5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL */}
                  {row.cover && <img src={row.cover} alt="" className="absolute inset-0 size-full object-cover" />}
                  <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-black/45 text-white">
                    <Play aria-hidden="true" size={14} className="fill-white" />
                  </span>
                  {row.uploading && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[11px] text-white">{e("uploading")}</span>}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <FileButton label={t("replaceVideo")} icon={<Film aria-hidden="true" size={16} />} accept={UPLOAD_KINDS.video.types.join(",")} disabled={!!row.uploading} onFile={(f) => uploadVideo(f, row.key)} />
                  <FileButton label={row.cover ? t("replaceCover") : t("addCover")} icon={<ImageIcon aria-hidden="true" size={16} />} accept={UPLOAD_KINDS.thumb.types.join(",")} disabled={!!row.uploading} onFile={(f) => f && uploadCover(row.key, f)} />
                  {row.video.path && row.video.url === null && !row.uploading && <p className="text-xs text-good">{t("videoReady")}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`platform-${row.key}`} className="text-sm font-medium">{t("platform")}</label>
                <select id={`platform-${row.key}`} value={row.platform ?? ""} onChange={(ev) => update(row.key, { platform: (ev.target.value || null) as Platform | null })} className={control}>
                  <option value="">{t("noPlatform")}</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_NAMES[p]}</option>)}
                </select>
              </div>

              {langs.map((lang) => (
                <div key={lang} className="grid gap-3 sm:grid-cols-2">
                  {(["brand", "type"] as const).map((field) => (
                    <div key={field} className="flex flex-col gap-1.5">
                      <label htmlFor={`${field}-${lang}-${row.key}`} className="text-sm font-medium">
                        {t(field)}{langs.length > 1 && ` (${lang === "ar" ? t("inArabic") : t("inEnglish")})`}
                      </label>
                      <input
                        id={`${field}-${lang}-${row.key}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} value={row[lang][field]} maxLength={60}
                        placeholder={lang === "ar" ? t(`${field}PlaceholderAr`) : t(`${field}PlaceholderEn`)}
                        onChange={(ev) => update(row.key, { [lang]: { ...row[lang], [field]: ev.target.value } })}
                        className={control}
                      />
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex items-center justify-end gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={e("moveUp", { item: label(row, i) })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={e("moveDown", { item: label(row, i) })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                <button type="button" onClick={() => { setRows(rows.filter((r) => r.key !== row.key)); setStatus(""); }} aria-label={e("remove", { item: label(row, i) })} className={iconButton}><Trash2 aria-hidden="true" size={16} /></button>
              </div>
            </fieldset>
          </li>
        ))}
      </ul>

      {rows.length < MAX_WORKS && (
        <div>
          <label htmlFor={fileId} className={`${buttonClasses("secondary")} cursor-pointer`}>
            <Film aria-hidden="true" size={18} /> {t("addWork")}
          </label>
          <input id={fileId} type="file" accept={UPLOAD_KINDS.video.types.join(",")} className="sr-only" onChange={(ev) => { uploadVideo(ev.target.files?.[0]); ev.target.value = ""; }} />
          <p className="mt-1.5 text-xs text-muted">{t("videoHint")}</p>
        </div>
      )}
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

function FileButton({ label, icon, accept, disabled, onFile }: { label: string; icon: React.ReactNode; accept: string; disabled: boolean; onFile: (f?: File) => void }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className={`${buttonClasses("secondary", "justify-start px-4 text-sm")} cursor-pointer ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        {icon} {label}
      </label>
      <input id={id} type="file" accept={accept} disabled={disabled} className="sr-only" onChange={(ev) => { onFile(ev.target.files?.[0]); ev.target.value = ""; }} />
    </>
  );
}
