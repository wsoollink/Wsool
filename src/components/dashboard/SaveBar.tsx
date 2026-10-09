"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type Props = {
  onSave: () => void;
  pending: boolean;
  status: { tone: "good" | "bad"; text: string } | null;
  /** Extra button before Save (e.g. "Preview"). */
  extra?: ReactNode;
};

/**
 * One sticky "Save changes" bar for a whole section (dashboard design). On
 * phones it sits right above the bottom tab bar; on desktop at the bottom
 * of the content column.
 */
export function SaveBar({ onSave, pending, status, extra }: Props) {
  const t = useTranslations("SaveBar");
  const saved = status?.tone === "good";
  return (
    <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-10 border-t border-navy/8 bg-white/82 px-4 py-3 backdrop-blur-[14px] md:sticky md:inset-x-auto md:bottom-4 md:rounded-[18px] md:border md:shadow-card">
      <p role="status" aria-live="polite" className={`mb-2 text-center text-sm empty:hidden ${status?.tone === "bad" ? "text-bad" : "text-good"}`}>
        {status && !saved ? status.text : ""}
      </p>
      <div className="flex gap-2">
        {extra}
        <button
          type="button" onClick={onSave} disabled={pending} aria-busy={pending}
          className={`inline-flex h-12 flex-1 items-center justify-center rounded-full text-[15px] font-bold text-white transition-colors disabled:opacity-70 ${saved ? "bg-good" : "bg-blue"}`}
        >
          {pending ? t("saving") : saved ? t("saved") : t("save")}
        </button>
      </div>
    </div>
  );
}
