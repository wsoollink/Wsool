"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Eye, FileDown, Share2, X } from "lucide-react";
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
};

const soft = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-navy/5 px-4 text-sm font-medium text-navy hover:bg-navy/10";

/** "Your page link" card from the dashboard design: copy, share, view, PDF export. */
export function LinkCard({ username, url, published, pdfLangs, pdfNote, templateName }: Props) {
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
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ url }); } catch { /* closed */ }
    } else copy();
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-muted">{t("yourLink")}</span>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${published ? "text-good" : "text-warn"}`}>
          <span aria-hidden="true" className={`size-2 rounded-full ${published ? "bg-good" : "bg-warn"}`} />
          {published ? t("published") : t("hidden")}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span dir="ltr" className="min-w-0 truncate text-xl font-bold md:text-2xl">{shortUrl}</span>
        <button type="button" onClick={share} aria-label={t("shareLink")} className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5">
          <Share2 aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" onClick={copy} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue px-4 text-sm font-bold text-white">
          <Copy aria-hidden="true" size={16} /> <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </button>
        <a href={`/${username}`} target="_blank" rel="noopener noreferrer" className={soft}>
          <Eye aria-hidden="true" size={16} /> {t("viewPage")}
        </a>
        <button type="button" onClick={() => setPdfOpen(true)} className={soft} aria-haspopup="dialog">
          <FileDown aria-hidden="true" size={16} /> {t("exportPdf")}
        </button>
      </div>

      {pdfOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="pdf-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,16,0.5)] p-4" onClick={(e) => e.target === e.currentTarget && setPdfOpen(false)} onKeyDown={(e) => e.key === "Escape" && setPdfOpen(false)}>
          <div className="flex w-[min(440px,100%)] flex-col gap-4 rounded-[22px] bg-white/96 p-5 shadow-[0_24px_60px_rgba(10,12,16,0.25)]">
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
                        <button key={l} type="button" aria-pressed={pdfLang === l} onClick={() => setPdfLang(l)} className={`h-11 rounded-[10px] text-sm font-bold ${pdfLang === l ? "bg-white text-navy shadow-card" : "text-muted"}`}>
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
                <a href={`/${username}/pdf?lang=${pdfLang}&download`} className="inline-flex h-[52px] items-center justify-center rounded-full bg-blue text-[15px] font-bold text-white">
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
