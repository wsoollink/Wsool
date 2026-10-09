"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";

type Props = {
  /** Language the page is shown in. */
  lang: Locale;
  /** The other language, when the creator offers both. */
  otherLang: Locale | null;
  url: string;
  title: string;
  /** "photo": round pills over the hero photo (mobile); "header": bordered buttons (desktop bar). */
  variant: "photo" | "header";
};

function Globe() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 3v12" /><path d="M8 7l4-4 4 4" />
    </svg>
  );
}

/** Language switch + share, as in the design (hero corners on mobile, header bar on desktop). */
export function PageActions({ lang, otherLang, url, title, variant }: Props) {
  const t = useTranslations("CreatorPage");
  const [copied, setCopied] = useState(false);

  // The page language follows the visitor's language cookie (see src/proxy.ts).
  const switchLang = () => {
    if (!otherLang) return;
    document.cookie = `NEXT_LOCALE=${otherLang}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* closed by the visitor */ }
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langLabel = otherLang === "en" ? "English" : "العربية";
  const status = <span role="status" className="sr-only">{copied ? t("linkCopied") : ""}</span>;

  if (variant === "header") {
    const btn = "inline-flex h-11 items-center gap-2 rounded-[12px] border border-[var(--page-line)] bg-[var(--page-solid)] px-4 text-sm font-medium";
    return (
      <div className="flex items-center gap-2.5">
        {otherLang && (
          <button type="button" onClick={switchLang} lang={otherLang} className={btn}>
            <Globe /> {langLabel}
          </button>
        )}
        <button type="button" onClick={share} className={btn}>
          <ShareIcon /> {copied ? t("linkCopied") : t("share")}
        </button>
        {status}
      </div>
    );
  }

  const pill = "absolute top-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--page-pill)] text-[var(--page-text)] backdrop-blur-md";
  return (
    <>
      {otherLang && (
        <button type="button" onClick={switchLang} lang={otherLang} className={`${pill} start-4 gap-1.5 px-4 text-sm font-medium`}>
          <Globe /> {langLabel}
        </button>
      )}
      <button type="button" onClick={share} aria-label={t("sharePage")} className={`${pill} end-4 size-11`}>
        <ShareIcon />
      </button>
      {copied && (
        <span className="absolute end-4 top-[68px] rounded-full bg-[var(--page-pill)] px-3 py-1 text-xs font-medium text-[var(--page-text)] backdrop-blur-md">
          {t("linkCopied")}
        </span>
      )}
      {status}
    </>
  );
}
