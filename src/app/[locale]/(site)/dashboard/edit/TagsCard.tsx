"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Locale } from "@/i18n/config";
import { MAX_TAGS } from "@/lib/validation/profile";
import { saveTags } from "./actions";

const iconButton = "inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-navy/5 disabled:opacity-30";

/** Tags per language: add, remove, reorder (max 18 characters each). */
export function TagsCard({ langs, initial }: { langs: Locale[]; initial: Record<Locale, string[]> }) {
  const t = useTranslations("EditPage");
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="font-bold">{t("tags")}</h2>
        <p className="text-xs text-muted">{t("tagsHint", { max: MAX_TAGS })}</p>
      </div>
      {langs.map((lang) => <TagList key={lang} lang={lang} initial={initial[lang]} showTitle={langs.length > 1} />)}
    </Card>
  );
}

function TagList({ lang, initial, showTitle }: { lang: Locale; initial: string[]; showTitle: boolean }) {
  const t = useTranslations("EditPage");
  const [tags, setTags] = useState(initial);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const inputId = `tag-${lang}`;

  const add = () => {
    const label = draft.trim().slice(0, 18);
    if (!label || tags.includes(label) || tags.length >= MAX_TAGS) return;
    setTags([...tags, label]);
    setDraft("");
    setStatus("");
  };
  const move = (i: number, by: number) => {
    const next = [...tags];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setTags(next);
    setStatus("");
  };
  const save = () => startTransition(async () => setStatus((await saveTags(lang, tags)).ok ? "saved" : "failed"));

  return (
    <section className="flex flex-col gap-3">
      {showTitle && <h3 className="text-sm font-bold">{lang === "ar" ? t("arabicContent") : t("englishContent")}</h3>}
      <ul className="flex flex-col gap-1">
        {tags.map((tag, i) => (
          <li key={tag} className="flex items-center gap-1 rounded-xl border border-line ps-3">
            <span dir={dir} lang={lang} className="flex-1 truncate text-sm">{tag}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("moveUp", { item: tag })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === tags.length - 1} aria-label={t("moveDown", { item: tag })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
            <button type="button" onClick={() => { setTags(tags.filter((x) => x !== tag)); setStatus(""); }} aria-label={t("remove", { item: tag })} className={iconButton}><X aria-hidden="true" size={16} /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">{t("newTag")}</label>
        <input
          id={inputId} dir={dir} lang={lang} value={draft} maxLength={18} placeholder={t("newTag")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          disabled={tags.length >= MAX_TAGS}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-base"
        />
        <button type="button" onClick={add} disabled={!draft.trim() || tags.length >= MAX_TAGS} aria-label={t("addTag")} className={buttonClasses("secondary", "px-3")}>
          <Plus aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "failed" ? "text-bad" : "text-good"}`}>
          {status === "saved" ? t("saved") : status === "failed" ? t("errors.failed") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </section>
  );
}
