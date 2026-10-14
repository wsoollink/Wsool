"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { DASHBOARD_SECTIONS } from "@/config/dashboard";
import { SectionIcon } from "./SectionIcon";

/** Arabic-friendly matching: ignore case, hamza forms, taa marbuta and tatweel. */
const fold = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ـ/g, "");

/**
 * "Jump to a section" box in the desktop top bar (⌘K / Ctrl+K focuses it):
 * a combobox listing the dashboard sections that match what was typed.
 */
export function SectionSearch() {
  const t = useTranslations("DashboardNav");
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const items = [...DASHBOARD_SECTIONS.map((s) => ({ key: s.key, href: s.href })), { key: "notifications" as const, href: "/dashboard/notifications" }];
  const matches = items.filter((s) => fold(t(s.key)).includes(fold(q.trim())));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(href);
  };

  return (
    <div className="relative w-full max-w-[380px]" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <Search aria-hidden="true" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
      <input
        ref={input} type="text" role="combobox" value={q} placeholder={t("search")} aria-label={t("searchLabel")}
        aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-${matches[active].key}` : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && matches[active]) { e.preventDefault(); go(matches[active].href); }
          else if (e.key === "Escape") { setOpen(false); e.currentTarget.blur(); }
        }}
        className="h-9 w-full rounded-[10px] border border-line bg-bg ps-9 pe-14 text-[13px] outline-none placeholder:text-muted focus:border-blue focus:bg-card focus:ring-3 focus:ring-blue/15"
      />
      <kbd aria-hidden="true" className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 rounded-[5px] border border-line bg-card px-1.5 font-sans text-[10.5px] text-muted" dir="ltr">⌘K</kbd>
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-label={t("searchLabel")} className="absolute inset-x-0 top-[calc(100%+6px)] z-30 flex flex-col gap-0.5 rounded-xl border border-line bg-card p-1.5 shadow-pop">
          {matches.length ? matches.map((s, i) => (
            <li
              key={s.key} id={`${id}-${s.key}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} onClick={() => go(s.href)} onMouseEnter={() => setActive(i)}
              className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] ${i === active ? "bg-hover text-navy" : "text-muted"}`}
            >
              <SectionIcon section={s.key} size={16} />
              {t(s.key)}
            </li>
          )) : <li className="px-2.5 py-2 text-[13px] text-muted">{t("noResults")}</li>}
        </ul>
      )}
    </div>
  );
}
