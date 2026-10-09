"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Link2, MapPin, Play, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { SaveBar } from "@/components/dashboard/SaveBar";
import { Card } from "@/components/ui/Card";
import { UPLOAD_KINDS } from "@/config/uploads";
import { fromIntlLocale } from "@/i18n/config";
import { currencyLabel, decimalInput } from "@/lib/format";
import { linkKind, type LinkKind } from "@/lib/link-kind";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { MAX_LINKS, MAX_SERVICES, normalizeLinkUrl } from "@/lib/validation/links";
import { saveLinksAndServices } from "./actions";

type LinkRow = { key: string; title: string; titleEn: string; url: string; path: string | null; imageUrl: string | null; preview: string | null; uploading?: boolean; error?: "title" | "url" };
type ServiceRow = { key: string; name: string; nameEn: string; description: string; descriptionEn: string; price: string; unit: string; unitEn: string; error?: boolean };
type Props = {
  initialLinks: { title: string; titleEn: string; url: string; imageUrl: string | null }[];
  initialServices: Omit<ServiceRow, "key" | "error">[];
  currency: string;
  lang: { primary: "ar" | "en"; showEnglish: boolean };
  /** Free plan: how many of each the page shows (the dashboard keeps all). */
  freeLimits: { links: number; services: number } | null;
};

const newKey = () => Math.random().toString(36).slice(2);
const control = "h-12 w-full min-w-0 rounded-xl border border-navy/16 bg-white px-3 text-[15px] aria-[invalid=true]:border-bad";
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-navy/5 disabled:opacity-30";

const KIND_ICONS: Record<LinkKind, typeof Link2> = { map: MapPin, store: ShoppingBag, video: Play, link: Link2 };

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

/** "My links" + "My services" with one save for both (dashboard design style). */
export function LinksEditor({ initialLinks, initialServices, currency, lang, freeLimits }: Props) {
  const t = useTranslations("LinksPage");
  const e = useTranslations("EditPage");
  const locale = fromIntlLocale(useLocale());
  const fileBase = useId();
  const [links, setLinks] = useState<LinkRow[]>(initialLinks.map((l) => ({ key: newKey(), ...l, path: null, preview: l.imageUrl })));
  const [services, setServices] = useState<ServiceRow[]>(initialServices.map((s) => ({ key: newKey(), ...s })));
  const [status, setStatus] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [pending, startTransition] = useTransition();
  const cur = currencyLabel(currency, locale);
  const dirPrimary = lang.primary === "ar" ? "rtl" : "ltr";

  const setLink = (key: string, patch: Partial<LinkRow>) => { setLinks((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l))); setStatus(null); };
  const setService = (key: string, patch: Partial<ServiceRow>) => { setServices((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s))); setStatus(null); };

  async function pickImage(key: string, file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setLink(key, { preview: URL.createObjectURL(file), uploading: true });
    const uploaded = await uploadFile("linkImage", await shrinkImage(file, 600, 0.85, "image/webp"));
    if ("error" in uploaded) {
      setLink(key, { preview: links.find((l) => l.key === key)?.imageUrl ?? null, uploading: false });
      setUploadError(e(`uploadErrors.${uploaded.error}`));
    } else setLink(key, { path: uploaded.path, imageUrl: null, uploading: false });
  }

  const save = () => {
    // Browser-side check first, so the creator sees which row needs fixing.
    let bad = false;
    const checkedLinks = links.map((l) => {
      const url = normalizeLinkUrl(l.url);
      const urlOk = /^https:\/\/[^\s/]+\.[^\s]+/.test(url);
      const error = !l.title.trim() ? "title" : !urlOk ? "url" : undefined;
      if (error) bad = true;
      return { ...l, url, error } as LinkRow;
    });
    const checkedServices = services.map((s) => {
      const error = !s.name.trim();
      if (error) bad = true;
      return { ...s, error };
    });
    setLinks(checkedLinks);
    setServices(checkedServices);
    if (bad) return setStatus({ tone: "bad", text: t("fixErrors") });
    startTransition(async () => {
      const res = await saveLinksAndServices(
        checkedLinks.map((l) => ({ title: l.title, titleEn: l.titleEn, url: l.url, image: { path: l.path, url: l.path ? null : l.imageUrl } })),
        checkedServices.map((s) => ({ name: s.name, nameEn: s.nameEn, description: s.description, descriptionEn: s.descriptionEn, price: s.price, unit: s.unit, unitEn: s.unitEn })),
      );
      if (res.ok) return setStatus({ tone: "good", text: "" });
      if (res.error === "invalid_url" && res.index !== undefined) setLinks((all) => all.map((l, i) => (i === res.index ? { ...l, error: "url" } : l)));
      setStatus({ tone: "bad", text: res.error === "invalid_url" ? t("errors.url") : e("errors.failed") });
    });
  };

  const overFree = (n: number, limit?: number) => limit !== undefined && n > limit;

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-0">
      {/* My links */}
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold">{t("linksTitle")}</h2>
          <p className="text-xs text-muted">{t("linksHint", { max: MAX_LINKS })}</p>
        </div>
        {overFree(links.length, freeLimits?.links) && <p className="rounded-xl bg-warn/10 p-3 text-[13px] text-warn">{t("freeLimit", { n: freeLimits!.links })}</p>}
        <ul className="flex flex-col gap-3">
          {links.map((l, i) => {
            const Icon = KIND_ICONS[linkKind(normalizeLinkUrl(l.url))];
            const id = `${fileBase}-l${l.key}`;
            const label = l.title || t("linkN", { n: i + 1 });
            return (
              <li key={l.key} className="flex flex-col gap-3 rounded-[16px] border border-navy/8 bg-white/70 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <label htmlFor={`${id}-img`} className="relative flex size-[72px] cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border border-navy/10 bg-navy/[0.03]">
                      {l.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL
                        <img src={l.preview} alt="" className={`size-full object-cover ${l.uploading ? "opacity-40" : ""}`} />
                      ) : (
                        <Icon aria-hidden="true" size={26} className="text-muted" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-navy/55 py-0.5 text-center text-[10px] text-white">{l.uploading ? e("uploading") : l.preview ? t("changeImage") : t("addImage")}</span>
                      <span className="sr-only">{t("imageFor", { item: label })}</span>
                    </label>
                    <input id={`${id}-img`} type="file" accept={UPLOAD_KINDS.linkImage.types.join(",")} className="sr-only" onChange={(ev) => { pickImage(l.key, ev.target.files?.[0]); ev.target.value = ""; }} />
                    {l.preview && !l.uploading && (
                      <button type="button" onClick={() => setLink(l.key, { preview: null, path: null, imageUrl: null })} className="inline-flex min-h-11 items-center gap-1 text-xs text-muted">
                        <X aria-hidden="true" size={14} /> {t("removeImage")}
                      </button>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <Field id={`${id}-t`} label={t("linkTitle")}>
                      <input id={`${id}-t`} value={l.title} maxLength={60} dir={dirPrimary} lang={lang.primary} placeholder={t("linkTitlePh")} aria-invalid={l.error === "title"} onChange={(ev) => setLink(l.key, { title: ev.target.value, error: undefined })} className={control} />
                    </Field>
                    {lang.showEnglish && (
                      <Field id={`${id}-te`} label={t("titleEn")}>
                        <input id={`${id}-te`} value={l.titleEn} maxLength={60} dir="ltr" lang="en" onChange={(ev) => setLink(l.key, { titleEn: ev.target.value })} className={control} />
                      </Field>
                    )}
                    <Field id={`${id}-u`} label={t("linkUrl")} hint={l.error === "url" ? undefined : t("linkUrlHint")}>
                      <input id={`${id}-u`} value={l.url} maxLength={500} dir="ltr" inputMode="url" autoComplete="url" placeholder="https://" aria-invalid={l.error === "url"} onChange={(ev) => setLink(l.key, { url: ev.target.value, error: undefined })} className={control} />
                    </Field>
                    {l.error === "url" && <p role="alert" className="-mt-2 text-xs text-bad">{t("errors.url")}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 border-t border-navy/6 pt-2">
                  <button type="button" onClick={() => { setLinks(links.filter((x) => x.key !== l.key)); setStatus(null); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5">
                    <Trash2 aria-hidden="true" size={16} /> {e("remove", { item: label })}
                  </button>
                  <span className="flex-1" />
                  <button type="button" disabled={i === 0} onClick={() => setLinks(move(links, i, -1))} aria-label={e("moveUp", { item: label })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                  <button type="button" disabled={i === links.length - 1} onClick={() => setLinks(move(links, i, 1))} aria-label={e("moveDown", { item: label })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
        {uploadError && <p role="alert" className="text-sm text-bad">{uploadError}</p>}
        {links.length < MAX_LINKS && (
          <button type="button" onClick={() => setLinks([...links, { key: newKey(), title: "", titleEn: "", url: "", path: null, imageUrl: null, preview: null }])} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-navy/5 px-4 text-[13.5px] font-bold">
            <Plus aria-hidden="true" size={18} /> {t("addLink")}
          </button>
        )}
      </Card>

      {/* My services */}
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold">{t("servicesTitle")}</h2>
          <p className="text-xs text-muted">{t("servicesHint", { max: MAX_SERVICES })}</p>
        </div>
        {overFree(services.length, freeLimits?.services) && <p className="rounded-xl bg-warn/10 p-3 text-[13px] text-warn">{t("freeLimit", { n: freeLimits!.services })}</p>}
        <ul className="flex flex-col gap-3">
          {services.map((s, i) => {
            const id = `${fileBase}-s${s.key}`;
            const label = s.name || t("serviceN", { n: i + 1 });
            return (
              <li key={s.key} className="flex flex-col gap-3 rounded-[16px] border border-navy/8 bg-white/70 p-3">
                <Field id={`${id}-n`} label={t("serviceName")}>
                  <input id={`${id}-n`} value={s.name} maxLength={60} dir={dirPrimary} lang={lang.primary} placeholder={t("serviceNamePh")} aria-invalid={!!s.error} onChange={(ev) => setService(s.key, { name: ev.target.value, error: false })} className={control} />
                </Field>
                <Field id={`${id}-d`} label={t("description")}>
                  <textarea id={`${id}-d`} value={s.description} maxLength={300} rows={3} dir={dirPrimary} lang={lang.primary} placeholder={t("descriptionPh")} onChange={(ev) => setService(s.key, { description: ev.target.value })} className={`${control} h-auto py-2.5 leading-7`} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id={`${id}-p`} label={t("price")} hint={t("priceHint")}>
                    <div className="relative">
                      <input id={`${id}-p`} value={s.price} dir="ltr" inputMode="decimal" autoComplete="off" placeholder="—" onChange={(ev) => setService(s.key, { price: decimalInput(ev.target.value, 11) })} className={`${control} pe-14`} />
                      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{cur}</span>
                    </div>
                  </Field>
                  <Field id={`${id}-un`} label={t("unit")}>
                    <input id={`${id}-un`} value={s.unit} maxLength={30} dir={dirPrimary} lang={lang.primary} placeholder={t("unitPh")} onChange={(ev) => setService(s.key, { unit: ev.target.value })} className={control} />
                  </Field>
                </div>
                {lang.showEnglish && (
                  <div className="flex flex-col gap-3 rounded-xl bg-navy/[0.03] p-3">
                    <p className="text-xs font-bold text-muted">{t("englishVersion")}</p>
                    <Field id={`${id}-ne`} label={t("serviceName")}>
                      <input id={`${id}-ne`} value={s.nameEn} maxLength={60} dir="ltr" lang="en" onChange={(ev) => setService(s.key, { nameEn: ev.target.value })} className={control} />
                    </Field>
                    <Field id={`${id}-de`} label={t("description")}>
                      <textarea id={`${id}-de`} value={s.descriptionEn} maxLength={300} rows={2} dir="ltr" lang="en" onChange={(ev) => setService(s.key, { descriptionEn: ev.target.value })} className={`${control} h-auto py-2.5 leading-7`} />
                    </Field>
                    <Field id={`${id}-ue`} label={t("unit")}>
                      <input id={`${id}-ue`} value={s.unitEn} maxLength={30} dir="ltr" lang="en" placeholder="per hour" onChange={(ev) => setService(s.key, { unitEn: ev.target.value })} className={control} />
                    </Field>
                  </div>
                )}
                <div className="flex items-center gap-1 border-t border-navy/6 pt-2">
                  <button type="button" onClick={() => { setServices(services.filter((x) => x.key !== s.key)); setStatus(null); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5">
                    <Trash2 aria-hidden="true" size={16} /> {e("remove", { item: label })}
                  </button>
                  <span className="flex-1" />
                  <button type="button" disabled={i === 0} onClick={() => setServices(move(services, i, -1))} aria-label={e("moveUp", { item: label })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                  <button type="button" disabled={i === services.length - 1} onClick={() => setServices(move(services, i, 1))} aria-label={e("moveDown", { item: label })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
        {services.length < MAX_SERVICES && (
          <button type="button" onClick={() => setServices([...services, { key: newKey(), name: "", nameEn: "", description: "", descriptionEn: "", price: "", unit: "", unitEn: "" }])} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-navy/5 px-4 text-[13.5px] font-bold">
            <Plus aria-hidden="true" size={18} /> {t("addService")}
          </button>
        )}
        <p className="text-xs text-muted">{t("currencyNote", { currency: cur })}</p>
      </Card>

      <SaveBar onSave={save} pending={pending || links.some((l) => l.uploading)} status={status} />
    </div>
  );
}
