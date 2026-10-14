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
 * phones it is fixed to the bottom of the screen; on desktop it sticks to the
 * bottom of the content column.
 */
export function SaveBar({ onSave, pending, status, extra }: Props) {
  const t = useTranslations("SaveBar");
  const saved = status?.tone === "good";
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/82 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[14px] md:sticky md:inset-x-auto md:bottom-4 md:flex md:items-center md:justify-between md:gap-4 md:rounded-card md:border md:border-line md:px-4 md:py-3 md:shadow-pop">
      <p role="status" aria-live="polite" className={`mb-2 text-center text-sm empty:hidden md:mb-0 md:text-start ${status?.tone === "bad" ? "text-bad" : "text-good"}`}>
        {status && !saved ? status.text : ""}
      </p>
      <div className="flex gap-2 md:ms-auto">
        {extra}
        <button
          type="button" onClick={onSave} disabled={pending} aria-busy={pending}
          className={`inline-flex h-12 flex-1 items-center justify-center rounded-full text-[15px] font-bold md:h-10 md:flex-none md:px-8 md:text-sm text-on-blue transition-colors disabled:opacity-70 ${saved ? "bg-good" : "bg-blue"}`}
        >
          {pending ? t("saving") : saved ? t("saved") : t("save")}
        </button>
      </div>
    </div>
  );
}
