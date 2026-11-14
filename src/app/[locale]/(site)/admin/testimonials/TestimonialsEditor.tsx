"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, UserRound } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { saveTestimonials, requestTestimonialUpload, type SavedTestimonial } from "./actions";

type Row = Omit<SavedTestimonial, "id"> & { key: string; id: string | null; photoPath: string | null; preview: string | null; uploading: boolean };
const newKey = () => Math.random().toString(36).slice(2);
const control = "w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none shadow-card transition-[border-color,box-shadow] focus:border-blue focus:ring-3 focus:ring-blue/15";
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-muted hover:text-navy disabled:opacity-30";

const toRow = (t: SavedTestimonial): Row => ({ ...t, key: t.id, photoPath: null, preview: t.photoUrl, uploading: false });
const empty = (): Row => ({
  key: newKey(), id: null, name: "", nameEn: null, role: null, roleEn: null, quote: "", quoteEn: null,
  photoUrl: null, visible: true, photoPath: null, preview: null, uploading: false,
});

/** One page's testimonials (creators = home page, agencies = /agencies): add, edit, hide, reorder, delete; one save. */
export function TestimonialsEditor({ audience, initial, max }: { audience: "creators" | "agencies"; initial: SavedTestimonial[]; max: number }) {
  const t = useTranslations("Admin.testimonials");
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [status, setStatus] = useState<"" | "saved" | "invalid" | "photo" | "failed" | "upload">("");
  const [pending, startTransition] = useTransition();
  const files = useRef<Record<string, HTMLInputElement | null>>({});

  const set = (key: string, patch: Partial<Row>) => { setStatus(""); setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r))); };
  const move = (i: number, by: number) => { setStatus(""); setRows((all) => { const next = [...all]; [next[i], next[i + by]] = [next[i + by], next[i]]; return next; }); };

  const pickPhoto = async (r: Row, file: File | undefined) => {
    if (!file) return;
    set(r.key, { uploading: true });
    const ready = await shrinkImage(file, 600, 0.88);
    const up = await uploadFile("testimonialPhoto", ready, requestTestimonialUpload);
    if ("error" in up) { set(r.key, { uploading: false }); setStatus("upload"); return; }
    set(r.key, { uploading: false, photoPath: up.path, preview: URL.createObjectURL(ready) });
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveTestimonials(audience, rows.map((r) => ({
        id: r.id, name: r.name, nameEn: r.nameEn ?? "", role: r.role ?? "", roleEn: r.roleEn ?? "",
        quote: r.quote, quoteEn: r.quoteEn ?? "", visible: r.visible,
        photo: r.photoPath ? { path: r.photoPath } : r.photoUrl && r.preview ? { url: r.photoUrl } : null,
      })));
      if (res.ok && res.items) { setRows(res.items.map(toRow)); setStatus("saved"); }
      else setStatus(res.error ?? "failed");
    });

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">{t(`title.${audience}`)}</h2>
        <p className="text-xs leading-6 text-muted">{t(`hint.${audience}`)}</p>
      </div>
      {rows.length === 0 && <p className="rounded-2xl bg-navy/[0.03] p-4 text-sm text-muted">{t("empty")}</p>}
      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.key} className="flex flex-col gap-3 rounded-2xl border border-line p-3 sm:flex-row">
            <div className="flex shrink-0 flex-row items-center gap-3 sm:w-28 sm:flex-col">
              <button
                type="button" onClick={() => files.current[r.key]?.click()} disabled={r.uploading}
                aria-label={t("photo", { n: i + 1 })}
                className="relative inline-flex size-20 items-center justify-center overflow-hidden rounded-full border border-line bg-navy/5 text-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.preview ? <img src={r.preview} alt="" className="size-full object-cover" /> : <UserRound aria-hidden="true" size={30} />}
                <span className="absolute inset-x-0 bottom-0 flex justify-center bg-navy/60 py-0.5 text-white"><ImagePlus aria-hidden="true" size={13} /></span>
              </button>
              <input ref={(el) => { files.current[r.key] = el; }} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
                onChange={(e) => { void pickPhoto(r, e.target.files?.[0]); e.target.value = ""; }} />
              {r.uploading && <span className="text-xs text-muted">{t("uploading")}</span>}
              {r.preview && !r.uploading && (
                <button type="button" onClick={() => set(r.key, { preview: null, photoPath: null, photoUrl: null })} className="min-h-11 text-xs font-semibold text-bad">{t("removePhoto")}</button>
              )}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label={t("name")}><input value={r.name} maxLength={80} dir="rtl" lang="ar" onChange={(e) => set(r.key, { name: e.target.value })} className={`${control} h-11`} /></Field>
              <Field label={t("nameEn")}><input value={r.nameEn ?? ""} maxLength={80} dir="ltr" lang="en" onChange={(e) => set(r.key, { nameEn: e.target.value })} className={`${control} h-11`} /></Field>
              <Field label={t("role")}><input value={r.role ?? ""} maxLength={80} dir="rtl" lang="ar" placeholder={t(`rolePh.${audience}`)} onChange={(e) => set(r.key, { role: e.target.value })} className={`${control} h-11`} /></Field>
              <Field label={t("roleEn")}><input value={r.roleEn ?? ""} maxLength={80} dir="ltr" lang="en" onChange={(e) => set(r.key, { roleEn: e.target.value })} className={`${control} h-11`} /></Field>
              <Field label={t("quote")}><textarea value={r.quote} maxLength={400} rows={3} dir="rtl" lang="ar" onChange={(e) => set(r.key, { quote: e.target.value })} className={`${control} py-2 leading-7`} /></Field>
              <Field label={t("quoteEn")}><textarea value={r.quoteEn ?? ""} maxLength={400} rows={3} dir="ltr" lang="en" onChange={(e) => set(r.key, { quoteEn: e.target.value })} className={`${control} py-2 leading-7`} /></Field>
              <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                <Switch id={`tv-${r.key}`} checked={r.visible} onChange={(v) => set(r.key, { visible: v })} label={t("visible")} />
                <div className="flex gap-1">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("moveUp", { n: i + 1 })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                  <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t("moveDown", { n: i + 1 })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                  <button type="button" onClick={() => { setStatus(""); setRows((all) => all.filter((x) => x.key !== r.key)); }} aria-label={t("delete", { n: i + 1 })} className={`${iconButton} hover:text-bad`}><Trash2 aria-hidden="true" size={16} /></button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={rows.length >= max} onClick={() => { setStatus(""); setRows((all) => [...all, empty()]); }} className={buttonClasses("secondary")}>
          <Plus aria-hidden="true" size={16} /> {t("add")}
        </button>
        <button type="button" disabled={pending || rows.some((r) => r.uploading)} onClick={save} className={buttonClasses("primary")}>{pending ? t("saving") : t("save")}</button>
        {status && <p role="status" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>{t(`status.${status}`)}</p>}
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs font-semibold text-muted">{label}{children}</label>;
}
