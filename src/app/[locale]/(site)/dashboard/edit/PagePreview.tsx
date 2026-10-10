"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, RotateCw, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import type { Locale } from "@/i18n/config";
import { SAVED_EVENT } from "@/lib/saved-event";

/**
 * The creator's real page in a phone-sized frame (/<username>/preview, owner
 * only, works while hidden). Reloads after every save on the Edit page.
 * Desktop: sticky beside the cards. Phone: a button opens it full screen.
 */
export function PagePreview({ username, langs }: { username: string; langs: Locale[] }) {
  const t = useTranslations("EditPage");
  const [version, setVersion] = useState(0);
  const [lang, setLang] = useState<Locale>(langs[0]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const reload = () => setVersion((v) => v + 1);
    window.addEventListener(SAVED_EVENT, reload);
    return () => window.removeEventListener(SAVED_EVENT, reload);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const src = `/${username}/preview?lang=${lang}&v=${version}`;
  const controls = (
    <div className="flex items-center gap-1">
      {langs.length > 1 && langs.map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs font-bold ${lang === l ? "bg-navy text-white" : "bg-navy/5"}`}>
          {l === "ar" ? "ع" : "EN"}
        </button>
      ))}
      <button type="button" onClick={() => setVersion((v) => v + 1)} aria-label={t("previewReload")} className="inline-flex size-11 items-center justify-center rounded-full bg-navy/5 text-muted hover:text-navy">
        <RotateCw aria-hidden="true" size={16} />
      </button>
    </div>
  );
  const frame = (className: string) => (
    <iframe key={src} src={src} title={t("previewTitle")} className={`w-full border-0 bg-white ${className}`} />
  );

  return (
    <>
      <aside aria-label={t("previewTitle")} className="sticky top-6 hidden flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:flex">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">{t("previewTitle")}</h2>
          {controls}
        </div>
        <div className="overflow-hidden rounded-[32px] border-[6px] border-navy/90 shadow-card">
          {frame("h-[min(720px,calc(100dvh-140px))]")}
        </div>
        <p className="text-xs text-muted">{t("previewHint")}</p>
      </aside>

      <button type="button" onClick={() => setOpen(true)} className={buttonClasses("secondary", "w-full lg:hidden")}>
        <Eye aria-hidden="true" size={18} /> {t("previewOpen")}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={t("previewTitle")} className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between gap-2 border-b border-navy/8 px-3 py-1.5">
            <button type="button" autoFocus onClick={() => setOpen(false)} aria-label={t("previewClose")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-navy/5">
              <X aria-hidden="true" size={20} />
            </button>
            {controls}
          </div>
          {frame("flex-1")}
        </div>
      )}
    </>
  );
}
