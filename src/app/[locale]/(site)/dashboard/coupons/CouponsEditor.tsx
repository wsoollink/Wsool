"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Store, Trash2, X } from "lucide-react";
import { SaveBar } from "@/components/dashboard/SaveBar";
import { Card } from "@/components/ui/Card";
import { UPLOAD_KINDS } from "@/config/uploads";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { MAX_COUPONS, normalizeCouponCode } from "@/lib/validation/coupons";
import { normalizeLinkUrl } from "@/lib/validation/links";
import { saveCoupons } from "./actions";

type Row = {
  key: string; store: string; storeEn: string; description: string; descriptionEn: string; code: string; url: string; expiresOn: string;
  path: string | null; logoUrl: string | null; preview: string | null; uploading?: boolean; error?: "store" | "code" | "url";
};
type Props = {
  initial: Omit<Row, "key" | "path" | "preview" | "uploading" | "error">[];
  lang: { primary: "ar" | "en"; showEnglish: boolean };
  /** Free plan: how many coupons the page shows (the dashboard keeps all). */
  freeLimit: number | null;
};

const newKey = () => Math.random().toString(36).slice(2);
const control = "h-11 w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] aria-[invalid=true]:border-bad outline-none shadow-card transition-[border-color,box-shadow] focus:border-blue focus:ring-3 focus:ring-blue/15";
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-navy/5 disabled:opacity-30";
const CODE = /^[\p{L}\p{N}._-]{1,30}$/u;

function move<T>(list: T[], i: number, by: number) {
  const next = [...list];
  [next[i], next[i + by]] = [next[i + by], next[i]];
  return next;
}

function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** "Discount coupons": store logo + name, what the discount is, the code, the tracking link, optional end date. */
export function CouponsEditor({ initial, lang, freeLimit }: Props) {
  const t = useTranslations("CouponsPage");
  const e = useTranslations("EditPage");
  const fileBase = useId();
  const [rows, setRows] = useState<Row[]>(initial.map((c) => ({ key: newKey(), ...c, path: null, preview: c.logoUrl })));
  const [status, setStatus] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [pending, startTransition] = useTransition();
  const dirPrimary = lang.primary === "ar" ? "rtl" : "ltr";

  const set = (key: string, patch: Partial<Row>) => { setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r))); setStatus(null); };

  async function pickLogo(key: string, file: File | undefined) {
    if (!file) return;
    setUploadError("");
    set(key, { preview: URL.createObjectURL(file), uploading: true });
    const uploaded = await uploadFile("couponLogo", await shrinkImage(file, 400, 0.9, "image/webp"));
    if ("error" in uploaded) {
      set(key, { preview: rows.find((r) => r.key === key)?.logoUrl ?? null, uploading: false });
      setUploadError(e(`uploadErrors.${uploaded.error}`));
    } else set(key, { path: uploaded.path, logoUrl: null, uploading: false });
  }

  const save = () => {
    // Browser-side check first, so the creator sees which coupon needs fixing.
    let bad = false;
    const checked = rows.map((r) => {
      const url = normalizeLinkUrl(r.url);
      const code = normalizeCouponCode(r.code);
      const error = !r.store.trim() ? "store" : !CODE.test(code) ? "code" : !/^https:\/\/[^\s/]+\.[^\s]+/.test(url) ? "url" : undefined;
      if (error) bad = true;
      return { ...r, url, code, error } as Row;
    });
    setRows(checked);
    if (bad) return setStatus({ tone: "bad", text: t("fixErrors") });
    startTransition(async () => {
      const res = await saveCoupons(checked.map((r) => ({
        store: r.store, storeEn: r.storeEn, description: r.description, descriptionEn: r.descriptionEn, code: r.code, url: r.url,
        expiresOn: r.expiresOn, logo: { path: r.path, url: r.path ? null : r.logoUrl },
      })));
      if (res.ok) return setStatus({ tone: "good", text: "" });
      if (res.index !== undefined && (res.error === "invalid_url" || res.error === "invalid_code")) {
        setRows((all) => all.map((r, i) => (i === res.index ? { ...r, error: res.error === "invalid_url" ? "url" : "code" } : r)));
      }
      setStatus({ tone: "bad", text: res.error === "invalid_url" ? t("errors.url") : res.error === "invalid_code" ? t("errors.code") : e("errors.failed") });
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-0">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold">{t("title")}</h2>
          <p className="text-xs text-muted">{t("hint", { max: MAX_COUPONS })}</p>
        </div>
        {freeLimit !== null && rows.length > freeLimit && <p className="rounded-xl bg-warn/10 p-3 text-[13px] text-warn">{t("freeLimit", { n: freeLimit })}</p>}
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const id = `${fileBase}-c${r.key}`;
            const label = r.store || t("couponN", { n: i + 1 });
            return (
              <li key={r.key} className="flex flex-col gap-3 rounded-[16px] border border-line bg-card/70 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <label htmlFor={`${id}-img`} className="relative flex size-[72px] cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border border-navy/10 bg-white">
                      {r.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL
                        <img src={r.preview} alt="" className={`size-full object-contain p-1.5 ${r.uploading ? "opacity-40" : ""}`} />
                      ) : (
                        <Store aria-hidden="true" size={26} className="text-muted" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] text-white">{r.uploading ? e("uploading") : r.preview ? t("changeLogo") : t("addLogo")}</span>
                      <span className="sr-only">{t("logoFor", { item: label })}</span>
                    </label>
                    <input id={`${id}-img`} type="file" accept={UPLOAD_KINDS.couponLogo.types.join(",")} className="sr-only" onChange={(ev) => { pickLogo(r.key, ev.target.files?.[0]); ev.target.value = ""; }} />
                    {r.preview && !r.uploading && (
                      <button type="button" onClick={() => set(r.key, { preview: null, path: null, logoUrl: null })} className="inline-flex min-h-11 items-center gap-1 text-xs text-muted">
                        <X aria-hidden="true" size={14} /> {t("removeLogo")}
                      </button>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <Field id={`${id}-s`} label={t("store")}>
                      <input id={`${id}-s`} value={r.store} maxLength={40} dir={dirPrimary} lang={lang.primary} placeholder={t("storePh")} aria-invalid={r.error === "store"} onChange={(ev) => set(r.key, { store: ev.target.value, error: undefined })} className={control} />
                    </Field>
                    <Field id={`${id}-d`} label={t("description")}>
                      <input id={`${id}-d`} value={r.description} maxLength={120} dir={dirPrimary} lang={lang.primary} placeholder={t("descriptionPh")} onChange={(ev) => set(r.key, { description: ev.target.value })} className={control} />
                    </Field>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field id={`${id}-k`} label={t("code")}>
                    <input id={`${id}-k`} value={r.code} maxLength={30} dir="ltr" autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="IBRAHIM10" aria-invalid={r.error === "code"} onChange={(ev) => set(r.key, { code: normalizeCouponCode(ev.target.value), error: undefined })} className={`${control} font-mono tracking-wider`} />
                  </Field>
                  <Field id={`${id}-x`} label={t("expires")} hint={t("expiresHint")}>
                    <input id={`${id}-x`} type="date" value={r.expiresOn} dir="ltr" onChange={(ev) => set(r.key, { expiresOn: ev.target.value })} className={control} />
                  </Field>
                </div>
                {r.error === "code" && <p role="alert" className="-mt-2 text-xs text-bad">{t("errors.code")}</p>}
                <Field id={`${id}-u`} label={t("url")} hint={r.error === "url" ? undefined : t("urlHint")}>
                  <input id={`${id}-u`} value={r.url} maxLength={500} dir="ltr" inputMode="url" autoComplete="url" placeholder="https://" aria-invalid={r.error === "url"} onChange={(ev) => set(r.key, { url: ev.target.value, error: undefined })} className={control} />
                </Field>
                {r.error === "url" && <p role="alert" className="-mt-2 text-xs text-bad">{t("errors.url")}</p>}
                {lang.showEnglish && (
                  <div className="flex flex-col gap-3 rounded-xl bg-navy/[0.03] p-3">
                    <p className="text-xs font-bold text-muted">{t("englishVersion")}</p>
                    <Field id={`${id}-se`} label={t("store")}>
                      <input id={`${id}-se`} value={r.storeEn} maxLength={40} dir="ltr" lang="en" onChange={(ev) => set(r.key, { storeEn: ev.target.value })} className={control} />
                    </Field>
                    <Field id={`${id}-de`} label={t("description")}>
                      <input id={`${id}-de`} value={r.descriptionEn} maxLength={120} dir="ltr" lang="en" placeholder="10% off everything" onChange={(ev) => set(r.key, { descriptionEn: ev.target.value })} className={control} />
                    </Field>
                  </div>
                )}
                <div className="flex items-center gap-1 border-t border-navy/6 pt-2">
                  <button type="button" onClick={() => { setRows(rows.filter((x) => x.key !== r.key)); setStatus(null); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5">
                    <Trash2 aria-hidden="true" size={16} /> {e("remove", { item: label })}
                  </button>
                  <span className="flex-1" />
                  <button type="button" disabled={i === 0} onClick={() => setRows(move(rows, i, -1))} aria-label={e("moveUp", { item: label })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                  <button type="button" disabled={i === rows.length - 1} onClick={() => setRows(move(rows, i, 1))} aria-label={e("moveDown", { item: label })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
        {uploadError && <p role="alert" className="text-sm text-bad">{uploadError}</p>}
        {rows.length < MAX_COUPONS && (
          <button type="button" onClick={() => setRows([...rows, { key: newKey(), store: "", storeEn: "", description: "", descriptionEn: "", code: "", url: "", expiresOn: "", path: null, logoUrl: null, preview: null }])} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-line bg-card shadow-card hover:bg-hover px-4 text-[13.5px] font-bold">
            <Plus aria-hidden="true" size={18} /> {t("add")}
          </button>
        )}
        <p className="text-xs text-muted">{t("disclosureNote")}</p>
      </Card>

      <SaveBar onSave={save} pending={pending || rows.some((r) => r.uploading)} status={status} />
    </div>
  );
}
