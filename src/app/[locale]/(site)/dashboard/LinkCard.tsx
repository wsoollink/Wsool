"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, FileDown, Languages, Palette, Share2, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import type { Locale } from "@/i18n/config";

type Props = {
  username: string;
  url: string;
  published: boolean;
  /** Languages the PDF can be made in, or null when PDF isn't available. */
  pdfLangs: Locale[] | null;
  pdfNote: string | null;
  templateName: string;
  /** "العربية + English" etc. */
  languages: string;
};

/** "Your page link" card from the dashboard design: copy, share, view, PDF export. */
export function LinkCard({ username, url, published, pdfLangs, pdfNote, templateName, languages }: Props) {
  const t = useTranslations("Home");
  const [copied, setCopied] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfLang, setPdfLang] = useState<Locale>(pdfLangs?.[0] ?? "ar");
  const shortUrl = url.replace(/^https?:\/\//, "");

  const copy = async () => {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[12.5px] text-muted">{t("yourLink")}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span dir="ltr" className="min-w-0 truncate text-lg font-bold md:text-xl">
            <span className="font-medium text-faint">{shortUrl.slice(0, shortUrl.length - username.length)}</span>{username}
          </span>
          <Pill tone={published ? "good" : "warn"}>{published ? t("published") : t("hidden")}</Pill>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5"><Palette aria-hidden="true" size={14} className="text-faint" />{t("template", { name: templateName })}</span>
          <span className="inline-flex items-center gap-1.5"><Languages aria-hidden="true" size={14} className="text-faint" />{languages}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 [&>*]:whitespace-nowrap">
        <button type="button" onClick={copy} className={buttonClasses("secondary", "px-3.5 md:px-4")}>
          <Copy aria-hidden="true" size={15} /> <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </button>
        <a href={`/${username}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "px-3.5 md:px-4")}>
          <ExternalLink aria-hidden="true" size={15} /> {t("viewPage")}
        </a>
        <button type="button" onClick={() => setPdfOpen(true)} className={buttonClasses("secondary", "px-3.5 md:px-4")} aria-haspopup="dialog">
          <FileDown aria-hidden="true" size={15} /> PDF
        </button>
      </div>

      {pdfOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="pdf-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,16,0.5)] p-4" onClick={(e) => e.target === e.currentTarget && setPdfOpen(false)} onKeyDown={(e) => e.key === "Escape" && setPdfOpen(false)}>
          <div className="flex w-[min(440px,100%)] flex-col gap-4 rounded-[22px] bg-card/96 p-5 shadow-[0_24px_60px_rgba(10,12,16,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id="pdf-title" className="text-lg font-bold">{t("pdfTitle")}</h2>
                <p className="text-[13px] text-muted">{t("pdfSubtitle")}</p>
              </div>
              <button type="button" autoFocus onClick={() => setPdfOpen(false)} aria-label={t("close")} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-navy/5">
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            {pdfLangs ? (
              <>
                {pdfLangs.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-medium">{t("pdfLang")}</span>
                    <div role="group" aria-label={t("pdfLang")} className="grid grid-cols-2 gap-1 rounded-[14px] bg-navy/5 p-1">
                      {pdfLangs.map((l) => (
                        <button key={l} type="button" aria-pressed={pdfLang === l} onClick={() => setPdfLang(l)} className={`h-11 rounded-[10px] text-sm font-bold ${pdfLang === l ? "bg-card text-navy shadow-card" : "text-muted"}`}>
                          {l === "ar" ? "العربية" : "English"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between rounded-[14px] bg-navy/5 px-4 py-3 text-[13px]">
                  <span className="text-muted">{t("pdfTemplate")}</span>
                  <span className="font-bold">{templateName}</span>
                </div>
                <a href={`/${username}/pdf?lang=${pdfLang}&download`} className="inline-flex h-[52px] items-center justify-center rounded-full bg-blue text-[15px] font-bold text-on-blue">
                  {t("pdfDownload")}
                </a>
              </>
            ) : (
              <p className="rounded-[14px] bg-navy/5 px-4 py-3 text-sm text-muted">{pdfNote}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/** "Share your link" (page header): the phone's share sheet, or copies the link. */
export function ShareButton({ url }: { url: string }) {
  const t = useTranslations("Home");
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ url }); } catch { /* closed */ }
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={share} className={buttonClasses("primary")}>
      {copied ? <Check aria-hidden="true" size={16} /> : <Share2 aria-hidden="true" size={16} />}
      <span aria-live="polite">{copied ? t("copied") : t("share")}</span>
    </button>
  );
}
