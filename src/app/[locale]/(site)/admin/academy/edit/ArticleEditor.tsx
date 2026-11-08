"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, ExternalLink, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UPLOAD_KINDS } from "@/config/uploads";
import { ACADEMY_CATEGORIES, SLUG_PATTERN, type ArticleInput } from "@/lib/academy-shared";
import { bodyToWebHtml } from "@/lib/rich-text";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { RichEditor, type ImageUpload } from "@/components/admin/RichEditor";
import { academyImageUrl, deleteArticle, requestAcademyUpload, saveArticle } from "../actions";

const input = "h-11 w-full rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none shadow-card transition-[border-color,box-shadow] focus:border-blue focus:ring-3 focus:ring-blue/15";
const UPLOAD: ImageUpload = { kind: "academyImage", request: requestAcademyUpload, url: academyImageUrl };

/** Latin words of a title joined with "-" (only useful for English titles; Arabic ones need a typed address). */
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-").slice(0, 80).replace(/-+$/, "");

/** "2026-11-07T09:30" in the browser's time zone, for a datetime-local field. */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/**
 * Academy article editor (admin): language, title, address, summary, category, cover, body in the newsletter's format
 * with its toolbar and emoji picker, a live preview as it will look on the site, then save as draft / publish / schedule.
 */
export function ArticleEditor({ id, initial, draftSlug, publishedAt }: { id: string; initial: ArticleInput; draftSlug: string; publishedAt: string | null }) {
  const t = useTranslations("Admin.academy");
  const ta = useTranslations("Academy");
  const router = useRouter();
  const [f, setF] = useState<ArticleInput>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [coverBusy, setCoverBusy] = useState(false);
  const [schedule, setSchedule] = useState(() => (publishedAt && new Date(publishedAt) > new Date() ? localInput(new Date(publishedAt)) : ""));
  const file = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => bodyToWebHtml(f.body), [f.body]);
  const now = new Date();
  const state = !publishedAt ? "draft" : new Date(publishedAt) > now ? "scheduled" : "published";
  const set = (patch: Partial<ArticleInput>) => { setF((cur) => ({ ...cur, ...patch })); setMsg(null); };
  const slugOk = SLUG_PATTERN.test(f.slug) && f.slug.length >= 3;

  const save = (when: "draft" | "now" | "schedule") => {
    if (f.title.trim().length < 3) return setMsg({ ok: false, text: t("errors.title") });
    if (!slugOk) return setMsg({ ok: false, text: t("errors.slug") });
    start(async () => {
      const res = await saveArticle(id, f, when, when === "schedule" && schedule ? new Date(schedule).toISOString() : undefined);
      if (res.error) return setMsg({ ok: false, text: t(`errors.${res.error}`) });
      setMsg({ ok: true, text: t(`saved.${when}`) });
      router.refresh();
    });
  };

  const pickCover = async (picked: File | undefined) => {
    if (!picked) return;
    setCoverBusy(true); setMsg(null);
    try {
      const ready = picked.type === "image/gif" ? picked : await shrinkImage(picked, 1600, 0.85, "image/jpeg");
      const up = await uploadFile("academyImage", ready, requestAcademyUpload);
      if ("error" in up) return setMsg({ ok: false, text: t("errors.upload") });
      const res = await academyImageUrl(up.path);
      if (!res.url) return setMsg({ ok: false, text: t("errors.upload") });
      set({ coverUrl: res.url });
    } finally { setCoverBusy(false); if (file.current) file.current.value = ""; }
  };

  const remove = () => {
    if (!window.confirm(t("confirmDelete"))) return;
    start(async () => { const r = await deleteArticle(id); if (r.ok) router.push("/admin/academy"); });
  };

  const field = "flex flex-col gap-1.5 text-sm font-bold";
  const dir = f.lang === "ar" ? "rtl" : "ltr";
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="flex flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state === "published" ? "bg-good/10 text-good" : state === "scheduled" ? "bg-blue/10 text-blue" : "bg-navy/5 text-muted"}`}>{t(`state.${state}`)}</span>
          {state === "published" && <a href={`/academy/${f.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-sm font-bold text-blue">{t("view")} <ExternalLink aria-hidden="true" size={14} /></a>}
        </div>
        <label className={field}>{t("lang")}
          <select value={f.lang} onChange={(e) => set({ lang: e.target.value as "ar" | "en" })} className={input}>
            <option value="ar">العربية</option><option value="en">English</option>
          </select>
        </label>
        <label className={field}>{t("titleLabel")}
          <input value={f.title} maxLength={120} dir={dir} lang={f.lang} className={input}
            onChange={(e) => set({ title: e.target.value, ...(!slugTouched && f.lang === "en" ? { slug: slugify(e.target.value) } : {}) })} />
        </label>
        <label className={field}>{t("slug")}
          <div className="flex items-center gap-1 rounded-[10px] border border-navy/15 bg-card ps-3 shadow-card focus-within:border-blue" dir="ltr">
            <span className="shrink-0 text-sm text-muted">wsool.link/academy/</span>
            <input value={f.slug} maxLength={80} dir="ltr" placeholder={draftSlug.startsWith("draft-") ? "how-to-price-your-ads" : ""} className="h-11 min-w-0 flex-1 bg-transparent pe-3 text-[15px] outline-none"
              onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-") }); }} />
          </div>
          <span className={`text-xs font-normal ${f.slug && !slugOk ? "text-bad" : "text-muted"}`}>{t("slugHint")}</span>
        </label>
        <label className={field}>{t("summary")}
          <textarea value={f.summary} maxLength={300} rows={2} dir={dir} lang={f.lang} className={`${input} h-auto py-2`} onChange={(e) => set({ summary: e.target.value })} />
          <span className="text-xs font-normal text-muted">{t("summaryHint")} · {f.summary.length}/300</span>
        </label>
        <label className={field}>{t("category")}
          <select value={f.category} onChange={(e) => set({ category: e.target.value as ArticleInput["category"] })} className={input}>
            {ACADEMY_CATEGORIES.map((c) => <option key={c} value={c}>{ta(`cat.${c}`)}</option>)}
          </select>
        </label>
        <div className={field}>
          <span>{t("cover")}</span>
          {f.coverUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.coverUrl} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
              <button type="button" onClick={() => set({ coverUrl: null })} className="absolute end-2 top-2 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white" aria-label={t("removeCover")}><X aria-hidden="true" size={18} /></button>
            </div>
          ) : (
            <button type="button" disabled={coverBusy} onClick={() => file.current?.click()} className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm font-bold text-muted hover:border-blue/40">
              {coverBusy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <ImagePlus aria-hidden="true" />} {t("addCover")}
            </button>
          )}
          <input ref={file} type="file" accept={UPLOAD_KINDS.academyImage.types.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pickCover(e.target.files?.[0])} />
          <span className="text-xs font-normal text-muted">{t("coverHint")}</span>
        </div>
        <div className={field}>
          <span id="article-body-label">{t("body")}</span>
          <div className="font-normal">
            <RichEditor key={f.lang} id="article-body" labelledBy="article-body-label" value={f.body} onChange={(v) => set({ body: v })} lang={f.lang} upload={UPLOAD} />
          </div>
          <span className="text-xs font-normal text-muted">{t("bodyHint")}</span>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => save("now")} className={buttonClasses("primary")}>{state === "published" ? t("update") : t("publish")}</button>
            <button type="button" disabled={pending} onClick={() => save("draft")} className={buttonClasses("secondary")}>{state === "draft" ? t("saveDraft") : t("unpublish")}</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarClock aria-hidden="true" size={18} className="text-muted" />
            <input type="datetime-local" value={schedule} min={localInput(now)} onChange={(e) => setSchedule(e.target.value)} aria-label={t("scheduleAt")} className={`${input} w-auto`} />
            <button type="button" disabled={pending || !schedule} onClick={() => save("schedule")} className={buttonClasses("secondary")}>{t("schedule")}</button>
          </div>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm font-bold ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
          <button type="button" disabled={pending} onClick={remove} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-sm font-bold text-bad hover:bg-bad/5"><Trash2 aria-hidden="true" size={16} /> {t("delete")}</button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-4 md:p-6 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
        <p className="text-xs font-bold text-muted">{t("preview")}</p>
        <article lang={f.lang} dir={dir} className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f.coverUrl && <img src={f.coverUrl} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />}
          <h1 className="text-2xl font-black leading-tight md:text-3xl">{f.title || t("untitled")}</h1>
          {f.summary && <p className="text-muted">{f.summary}</p>}
          <div className="ac-body" dangerouslySetInnerHTML={{ __html: preview }} />
        </article>
      </Card>
    </div>
  );
}
