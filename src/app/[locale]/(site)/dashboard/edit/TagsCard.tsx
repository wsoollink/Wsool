"use client";

import { notifySaved } from "@/lib/saved-event";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Locale } from "@/i18n/config";
import { MAX_TAGS } from "@/lib/validation/profile";
import { saveTags } from "./actions";

const iconButton = "inline-flex size-11 items-center justify-center rounded-lg text-muted hover:text-navy";

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
  const save = () =>
    startTransition(async () => {
      const ok = (await saveTags(lang, tags)).ok;
      setStatus(ok ? "saved" : "failed");
      if (ok) notifySaved();
    });

  return (
    <section className="flex flex-col gap-3">
      {showTitle && <h3 className="text-sm font-bold">{lang === "ar" ? t("arabicContent") : t("englishContent")}</h3>}
      {/* Chips as in the design; order = the order they were added. */}
      <ul className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li key={tag} className="inline-flex items-center gap-0.5 rounded-xl bg-navy/5 ps-3 text-[12.5px] font-medium">
            <span dir={dir} lang={lang} className="truncate">{tag}</span>
            <button type="button" onClick={() => { setTags(tags.filter((x) => x !== tag)); setStatus(""); }} aria-label={t("remove", { item: tag })} className={iconButton}><X aria-hidden="true" size={14} /></button>
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
          className="h-12 min-w-0 flex-1 rounded-xl border border-navy/16 bg-white px-4 text-[15px]"
        />
        <button type="button" onClick={add} disabled={!draft.trim() || tags.length >= MAX_TAGS} className={buttonClasses("primary", "h-12 px-4")}>
          <Plus aria-hidden="true" size={18} /> {t("addTag")}
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
