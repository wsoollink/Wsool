"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Share2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** The creator's referral link with copy and share (disabled while the account isn't Pro). */
export function RefLink({ url, username, disabled }: { url: string; username: string; disabled: boolean }) {
  const t = useTranslations("Referrals");
  const [copied, setCopied] = useState(false);
  const short = url.replace(/^https?:\/\//, "");
  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(url);
    flash();
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ url, text: t("shareText") }); } catch { /* closed */ }
      return;
    }
    await copy();
  };
  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[12.5px] text-muted">{t("yourLink")}</span>
        <span dir="ltr" className={`min-w-0 truncate text-lg font-bold md:text-xl ${disabled ? "text-faint line-through" : ""}`}>
          <span className="font-medium text-faint">{short.slice(0, short.length - username.length)}</span>{username}
        </span>
        <span className="text-[12.5px] text-muted">{t("linkHint")}</span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 [&>*]:whitespace-nowrap">
        <button type="button" onClick={copy} disabled={disabled} className={buttonClasses("secondary", "px-3.5 md:px-4")}>
          <Copy aria-hidden="true" size={15} /> <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </button>
        <button type="button" onClick={share} disabled={disabled} className={buttonClasses("primary", "px-3.5 md:px-4")}>
          {copied ? <Check aria-hidden="true" size={15} /> : <Share2 aria-hidden="true" size={15} />} {t("share")}
        </button>
      </div>
    </Card>
  );
}
