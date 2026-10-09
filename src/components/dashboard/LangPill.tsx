"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/config";

/** Globe pill that switches the dashboard language (design header). */
export function LangPill({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = current === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      lang={next}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const form = new FormData();
          form.set("locale", next);
          await setLocale(form);
          router.refresh();
        })
      }
      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-navy/8 bg-white/72 px-4 text-[13px] font-medium shadow-card backdrop-blur-[14px] disabled:opacity-60"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
      </svg>
      {next === "en" ? "English" : "العربية"}
    </button>
  );
}
