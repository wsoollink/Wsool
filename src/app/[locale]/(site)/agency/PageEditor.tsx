"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Check, Copy, Download, ExternalLink, Eye, ImagePlus, Share2 } from "lucide-react";
import { AGENCY_ACCENTS, AGENCY_TEMPLATES, agencyTheme } from "@/components/agency-page/theme";
import { SaveBar } from "@/components/dashboard/SaveBar";
import { Panel } from "@/components/ui/Card";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { Switch } from "@/components/ui/Switch";
import { normalizeUsername } from "@/config/usernames";
import type { AgencyTemplate, Platform } from "@/generated/prisma/enums";
import { LINK_PLATFORMS, PLATFORM_NAMES, PLATFORMS } from "@/config/platforms";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { digitsOnly } from "@/lib/format";
import { MAX_AGENCY_ACCOUNTS, MAX_AGENCY_BRANDS } from "@/lib/validation/agency-page";
import { initials } from "@/lib/initials";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { checkAgencySlug, requestAgencyUpload, saveAgencyPage } from "./page-actions";

export type EditorCreator = { linkId: string; name: string; username: string; photoUrl: string | null; hidden: boolean; creatorHidden: boolean };

export type EditorInitial = {
  slug: string; published: boolean; name: string; nameEn: string; tagline: string; taglineEn: string; bio: string; bioEn: string;
  city: string; cityEn: string; logoUrl: string | null; whatsapp: string; email: string; website: string;
  template: AgencyTemplate; accent: string | null; creators: EditorCreator[];
  accounts: { platform: Platform; handle: string; followers: number }[];
  brands: string[];
};

const pill = "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[13px] font-bold hover:border-blue/40 disabled:opacity-50";

/** "صفحة الوكالة" tab: link + publish, PDF, profile, contact, template, creators order. One save for everything. */
export function PageEditor({ initial, origin }: { initial: EditorInitial; origin: string }) {
  const t = useTranslations("AgencyPageEditor");
  const tp = useTranslations("AgencyPage");
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [logo, setLogo] = useState<{ path: string | null; url: string | null }>({ path: null, url: initial.logoUrl });
  const [uploading, setUploading] = useState(false);
  // Brand logos: url = shown (storage URL or local preview), path = fresh upload.
  const [brands, setBrands] = useState<{ path: string | null; url: string }[]>(initial.brands.map((url) => ({ path: null, url })));
  const brandRef = useRef<HTMLInputElement>(null);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | string>("idle");
  const [status, setStatus] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof EditorInitial>(k: K, val: EditorInitial[K]) => { setV((s) => ({ ...s, [k]: val })); setStatus(null); };

  // Live link check (debounced); the saved name counts as available.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const changeSlug = (raw: string) => {
    const slug = normalizeUsername(raw).slice(0, 20);
    set("slug", slug);
    clearTimeout(timer.current);
    if (!slug || slug === savedSlug) { setSlugState("idle"); return; }
    setSlugState("checking");
    timer.current = setTimeout(async () => setSlugState((await checkAgencySlug(slug)).error ?? "ok"), 400);
  };

  const pageUrl = savedSlug ? `${origin}/${savedSlug}` : null;
  const pdfUrl = (lang: "ar" | "en") => `/${savedSlug}/pdf?lang=${lang}&download`;

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const small = await shrinkImage(file, 600, 0.9, "image/png").catch(() => file);
    const r = await uploadFile("agencyLogo", small, requestAgencyUpload);
    setUploading(false);
    if ("error" in r) { setStatus({ tone: "bad", text: t("errors.upload") }); return; }
    setLogo({ path: r.path, url: URL.createObjectURL(small) });
    setStatus(null);
  };

  const addBrands = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, MAX_AGENCY_BRANDS - brands.length)) {
      // PNG keeps transparency and embeds in the PDF.
      const small = await shrinkImage(file, 600, 0.9, "image/png").catch(() => file);
      const r = await uploadFile("agencyBrand", small, requestAgencyUpload);
      if ("error" in r) { setStatus({ tone: "bad", text: t("errors.upload") }); continue; }
      setBrands((b) => [...b, { path: r.path, url: URL.createObjectURL(small) }]);
    }
    setUploading(false);
    setStatus(null);
  };

  const move = (i: number, d: -1 | 1) => {
    const list = [...v.creators];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set("creators", list);
  };

  const save = () => start(async () => {
    const r = await saveAgencyPage({
      ...v, slug: v.slug, logo: logo.path ? { path: logo.path, url: null } : { path: null, url: logo.url },
      creators: v.creators.map((c) => ({ linkId: c.linkId, hidden: c.hidden })),
      accounts: v.accounts.filter((a) => a.handle.trim()),
      brands: brands.map((b) => (b.path ? { path: b.path, url: null } : { path: null, url: b.url })),
      accent: v.accent as (typeof AGENCY_ACCENTS)[number] | null,
    });
    if ("ok" in r) {
      setSavedSlug(r.slug ?? "");
      setStatus({ tone: "good", text: "" });
      router.refresh();
    } else {
      if (r.slugError) setSlugState(r.slugError);
      setStatus({ tone: "bad", text: r.error === "account" && r.account !== undefined ? t("errors.account", { n: r.account + 1 }) : t(`errors.${r.error}`) });
    }
  });

  const share = async (url: string, title: string) => {
    if (navigator.share) { await navigator.share({ url, title }).catch(() => {}); return; }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const sharePdf = async () => {
    if (!savedSlug) return;
    const lang = document.documentElement.lang === "en" ? "en" : "ar";
    try {
      const res = await fetch(`/${savedSlug}/pdf?lang=${lang}`);
      const blob = await res.blob();
      const file = new File([blob], `${savedSlug}-${lang}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: v.name }); return; }
    } catch { /* falls back to sharing the link */ }
    await share(`${origin}${pdfUrl(lang).replace("&download", "")}`, v.name);
  };

  const slugMsg = slugState === "checking" ? t("checking") : slugState === "ok" ? t("available") : slugState !== "idle" ? t(`slugErr.${slugState}`) : undefined;

  return (
    <div className="flex flex-col gap-5 pb-28 md:pb-0">
      <p className="text-sm text-muted">{t("intro")}</p>

      <Panel title={t("linkTitle")}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ag-slug" className="text-sm font-medium">{t("slug")}</label>
            <div dir="ltr" className="flex min-h-11 items-center overflow-hidden rounded-[10px] border border-navy/15 bg-card shadow-card focus-within:border-blue focus-within:ring-3 focus-within:ring-blue/15">
              <span className="ps-3.5 text-[15px] text-muted">wsool.link/</span>
              <input id="ag-slug" value={v.slug} onChange={(e) => changeSlug(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                aria-describedby="ag-slug-msg" className="h-11 min-w-0 flex-1 bg-transparent pe-3 text-[16px] outline-none" />
            </div>
            <p id="ag-slug-msg" className={`text-xs ${slugState === "ok" ? "text-good" : slugState === "idle" || slugState === "checking" ? "text-muted" : "text-bad"}`}>{slugMsg ?? t("slugHint")}</p>
          </div>
          <Switch id="ag-pub" checked={v.published} onChange={(c) => set("published", c)} label={t("published")} hint={t("publishedHint")} />
          {pageUrl && (
            <div className="flex flex-wrap gap-2">
              <a href={initial.published ? `/${savedSlug}` : "/agency/preview"} target="_blank" rel="noopener noreferrer" className={pill}><ExternalLink aria-hidden="true" size={15} />{initial.published ? t("open") : t("preview")}</a>
              <button type="button" className={pill} onClick={() => share(pageUrl, v.name)}>{copied ? <Check aria-hidden="true" size={15} /> : <Share2 aria-hidden="true" size={15} />}{copied ? t("copied") : t("share")}</button>
              <button type="button" className={pill} onClick={async () => { await navigator.clipboard.writeText(pageUrl).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}><Copy aria-hidden="true" size={15} />{t("copy")}</button>
            </div>
          )}
        </div>
      </Panel>

      <Panel title={t("pdfTitle")}>
        <p className="text-sm text-muted">{t("pdfHint")}</p>
        {savedSlug ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={pdfUrl("ar")} className={pill}><Download aria-hidden="true" size={15} />{t("pdfAr")}</a>
            <a href={pdfUrl("en")} className={pill}><Download aria-hidden="true" size={15} />{t("pdfEn")}</a>
            <button type="button" className={pill} onClick={sharePdf}><Share2 aria-hidden="true" size={15} />{t("pdfShare")}</button>
          </div>
        ) : <p className="mt-3 text-sm font-semibold text-warn">{t("pdfNeedsPublish")}</p>}
      </Panel>

      <Panel title={t("profileTitle")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-4 md:col-span-2">
            {logo.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL
              <img src={logo.url} alt="" className="size-16 rounded-xl border border-line bg-white object-contain p-1" />
            ) : (
              <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-xl bg-blue/10 text-lg font-black text-blue uppercase">{initials(v.name || "?")}</span>
            )}
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
              <button type="button" className={pill} disabled={uploading} onClick={() => fileRef.current?.click()}><ImagePlus aria-hidden="true" size={15} />{uploading ? t("uploading") : logo.url ? t("logoChange") : t("logoPick")}</button>
              {logo.url && <button type="button" className={`${pill} text-bad`} onClick={() => setLogo({ path: null, url: null })}>{t("logoRemove")}</button>}
            </div>
          </div>
          <TextField id="ag-name" label={t("name")} value={v.name} maxLength={80} onChange={(e) => set("name", e.target.value)} />
          <TextField id="ag-name-en" label={t("nameEn")} value={v.nameEn} maxLength={80} dir="ltr" lang="en" onChange={(e) => set("nameEn", e.target.value)} />
          <TextField id="ag-tag" label={t("tagline")} value={v.tagline} maxLength={100} counter={`${v.tagline.length}/100`} onChange={(e) => set("tagline", e.target.value)} />
          <TextField id="ag-tag-en" label={t("taglineEn")} value={v.taglineEn} maxLength={100} dir="ltr" lang="en" counter={`${v.taglineEn.length}/100`} onChange={(e) => set("taglineEn", e.target.value)} />
          <TextAreaField id="ag-bio" label={t("bio")} value={v.bio} maxLength={800} counter={`${v.bio.length}/800`} onChange={(e) => set("bio", e.target.value)} />
          <TextAreaField id="ag-bio-en" label={t("bioEn")} value={v.bioEn} maxLength={800} dir="ltr" lang="en" counter={`${v.bioEn.length}/800`} onChange={(e) => set("bioEn", e.target.value)} />
          <TextField id="ag-city" label={t("city")} value={v.city} maxLength={60} onChange={(e) => set("city", e.target.value)} />
          <TextField id="ag-city-en" label={t("cityEn")} value={v.cityEn} maxLength={60} dir="ltr" lang="en" onChange={(e) => set("cityEn", e.target.value)} />
          <p className="text-xs text-muted md:col-span-2">{t("enHint")}</p>
        </div>
      </Panel>

      <Panel title={t("accountsTitle")}>
        <p className="text-sm text-muted">{t("accountsHint")}</p>
        <ul className="mt-4 flex flex-col gap-3">
          {v.accounts.map((a, i) => {
            const isLink = LINK_PLATFORMS.includes(a.platform);
            const setAcc = (patch: Partial<EditorInitial["accounts"][number]>) => set("accounts", v.accounts.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <li key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-line p-3 sm:grid-cols-[180px_minmax(0,1fr)_150px_auto] sm:items-end">
                <label className="flex flex-col gap-1 text-sm font-medium">{t("accPlatform")}
                  <span className="relative flex items-center">
                    <span className="pointer-events-none absolute start-3 text-muted"><PlatformIcon platform={a.platform} size={16} /></span>
                    <select value={a.platform} onChange={(e) => setAcc({ platform: e.target.value as Platform, handle: "" })}
                      className="h-11 w-full rounded-[10px] border border-navy/15 bg-card ps-9 pe-2 text-[15px] shadow-card">
                      {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_NAMES[p]}</option>)}
                    </select>
                  </span>
                </label>
                <TextField id={`acc-h-${i}`} label={isLink ? t("accLink") : t("accHandle")} value={a.handle} dir="ltr" maxLength={300}
                  placeholder={isLink ? "https://" : "@username"} onChange={(e) => setAcc({ handle: e.target.value })} />
                <TextField id={`acc-f-${i}`} label={t("accFollowers")} value={a.followers ? String(a.followers) : ""} inputMode="numeric" dir="ltr"
                  onChange={(e) => setAcc({ followers: Number(digitsOnly(e.target.value, 10)) || 0 })} />
                <button type="button" onClick={() => set("accounts", v.accounts.filter((_, j) => j !== i))}
                  className="inline-flex min-h-11 items-center justify-center rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5">{t("accRemove")}</button>
              </li>
            );
          })}
        </ul>
        {v.accounts.length < MAX_AGENCY_ACCOUNTS && (
          <button type="button" className={`${pill} mt-3`} onClick={() => set("accounts", [...v.accounts, { platform: "instagram", handle: "", followers: 0 }])}>
            + {t("accAdd")}
          </button>
        )}
      </Panel>

      <Panel title={t("brandsTitle")}>
        <p className="text-sm text-muted">{t("brandsHint")}</p>
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {brands.map((b, i) => (
            <li key={b.url} className="relative flex aspect-[3/2] items-center justify-center rounded-xl border border-line bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL */}
              <img src={b.url} alt="" className="max-h-full max-w-full object-contain" />
              <button type="button" aria-label={t("brandRemove")} onClick={() => setBrands((x) => x.filter((_, j) => j !== i))}
                className="absolute -end-2 -top-2 flex size-7 items-center justify-center rounded-full bg-bad text-sm font-bold text-white">×</button>
            </li>
          ))}
        </ul>
        <input ref={brandRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { addBrands(e.target.files); e.target.value = ""; }} />
        {brands.length < MAX_AGENCY_BRANDS && (
          <button type="button" className={`${pill} mt-3`} disabled={uploading} onClick={() => brandRef.current?.click()}>
            <ImagePlus aria-hidden="true" size={15} />{uploading ? t("uploading") : t("brandAdd")}
          </button>
        )}
      </Panel>

      <Panel title={t("contactTitle")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextField id="ag-wa" label={t("whatsapp")} value={v.whatsapp} inputMode="tel" dir="ltr" placeholder="9665XXXXXXXX" onChange={(e) => set("whatsapp", e.target.value)} />
          <TextField id="ag-email" label={t("email")} value={v.email} type="email" dir="ltr" onChange={(e) => set("email", e.target.value)} />
          <TextField id="ag-web" label={t("website")} value={v.website} inputMode="url" dir="ltr" placeholder="https://" onChange={(e) => set("website", e.target.value)} />
        </div>
      </Panel>

      <Panel title={t("designTitle")}>
        <p className="text-sm text-muted">{t("designHint")}</p>
        <div role="radiogroup" aria-label={t("designTitle")} className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {AGENCY_TEMPLATES.map((k) => {
            const th = agencyTheme(k, v.accent);
            const on = v.template === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => set("template", k)}
                className={`flex flex-col gap-2 rounded-2xl border-2 p-2 text-start ${on ? "border-blue" : "border-line hover:border-blue/40"}`}>
                <span aria-hidden="true" className="flex aspect-[4/3] w-full flex-col overflow-hidden rounded-xl border border-line" style={{ background: th.bg }}>
                  <span className="flex h-[46%] flex-col justify-end gap-1 p-2" style={{ background: th.heroBg }}>
                    <span className="h-2 w-3/5 rounded-full" style={{ background: th.heroInk }} />
                    <span className="h-1.5 w-2/5 rounded-full opacity-60" style={{ background: th.heroMuted }} />
                    <span className="mt-0.5 h-2.5 w-8 rounded-full" style={{ background: th.heroAccent }} />
                  </span>
                  <span className="grid flex-1 grid-cols-4 gap-1 p-2">
                    {[0, 1, 2, 3].map((i) => <span key={i} className="rounded-md" style={{ background: i % 2 ? th.line : th.accent, opacity: i % 2 ? 1 : 0.35 }} />)}
                  </span>
                </span>
                <span className="flex items-center justify-between px-1 text-sm font-bold">{tp(`templates.${k}`)}{on && <Check aria-hidden="true" size={16} className="text-blue" />}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-5 mb-2 text-sm font-medium">{t("accent")}</p>
        <div role="radiogroup" aria-label={t("accent")} className="flex flex-wrap items-center gap-2">
          <button type="button" role="radio" aria-checked={v.accent === null} onClick={() => set("accent", null)}
            className={`min-h-10 rounded-full border px-3.5 text-[13px] font-bold ${v.accent === null ? "border-blue bg-blue/10 text-blue" : "border-line"}`}>{t("accentDefault")}</button>
          {AGENCY_ACCENTS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={v.accent === c} aria-label={c} onClick={() => set("accent", c)}
              className={`flex size-11 items-center justify-center rounded-full ${v.accent === c ? "ring-2 ring-blue ring-offset-2 ring-offset-card" : ""}`}>
              <span className="size-8 rounded-full border border-black/10" style={{ background: c }} />
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={t("creatorsTitle")} flush>
        <p className="px-5 pt-4 text-sm text-muted">{t("creatorsHint")}</p>
        {v.creators.length === 0 ? <p className="p-5 text-sm text-muted">{t("noCreators")}</p> : (
          <ul className="mt-2 divide-y divide-line-soft">
            {v.creators.map((c, i) => (
              <li key={c.linkId} className="flex items-center gap-3 px-5 py-3">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- creator photo from storage
                  <img src={c.photoUrl} alt="" className={`size-10 shrink-0 rounded-full object-cover ${c.hidden || c.creatorHidden ? "opacity-40" : ""}`} />
                ) : <span aria-hidden="true" className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white uppercase">{initials(c.name)}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{c.name}</p>
                  <p className="text-xs text-muted" dir="ltr"><span className="rtl:float-right">@{c.username}</span></p>
                </div>
                {c.creatorHidden ? <Pill tone="grey">{t("hiddenByCreator")}</Pill> : (
                  <Switch checked={!c.hidden} labelHidden label={`${t("shown")}: ${c.name}`}
                    onChange={(on) => set("creators", v.creators.map((x) => (x.linkId === c.linkId ? { ...x, hidden: !on } : x)))} />
                )}
                <div className="flex">
                  <button type="button" aria-label={t("up")} disabled={i === 0} onClick={() => move(i, -1)} className="flex size-10 items-center justify-center rounded-full hover:bg-hover disabled:opacity-30"><ArrowUp aria-hidden="true" size={16} /></button>
                  <button type="button" aria-label={t("down")} disabled={i === v.creators.length - 1} onClick={() => move(i, 1)} className="flex size-10 items-center justify-center rounded-full hover:bg-hover disabled:opacity-30"><ArrowDown aria-hidden="true" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <SaveBar onSave={save} pending={pending || uploading} status={status}
        extra={savedSlug ? <a href="/agency/preview" target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-1.5 rounded-full border border-line px-5 text-[15px] font-bold md:h-10 md:text-sm"><Eye aria-hidden="true" size={16} />{t("preview")}</a> : undefined} />
    </div>
  );
}
