"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Smile } from "lucide-react";

type Group = { key: string; items: [string, string][] };
type Props = { onPick: (emoji: string) => void; disabled?: boolean; className?: string };

const RECENT_KEY = "wsool-emoji-recent";
const RECENT_MAX = 24;
const ICONS: Record<string, string> = {
  recent: "🕘", smileys: "😀", people: "👋", nature: "🌿", food: "☕", travel: "✈️", activities: "⚽", objects: "💡", symbols: "❤️", flags: "🇸🇦",
};

let groupsPromise: Promise<Group[]> | null = null;
/** The emoji list (about 200 KB) loads the first time a picker opens, not with the page. */
const loadGroups = () => (groupsPromise ??= import("./emoji-data").then((m) => m.EMOJI_GROUPS));

const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").filter((e: unknown) => typeof e === "string").slice(0, RECENT_MAX); } catch { return []; }
};

/**
 * Emoji button + panel (groups, search in Arabic or English, recently used). Used in the newsletter editor
 * for the subject and the body; the caller inserts the picked emoji where the cursor is.
 */
export function EmojiPicker({ onPick, disabled, className = "" }: Props) {
  const t = useTranslations("Admin.newsletter.emoji");
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [tab, setTab] = useState("smileys");
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    loadGroups().then(setGroups);
    // With a mouse, type to search at once; on phones the keyboard would cover the panel.
    if (matchMedia("(pointer: fine)").matches) search.current?.focus();
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const r = readRecent();
      setRecent(r);
      setTab(r.length ? "recent" : "smileys");
      setQuery("");
    }
    setOpen(!open);
  };

  const pick = (emoji: string) => {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, RECENT_MAX);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* private window: no recent list */ }
    onPick(emoji);
  };

  const q = query.trim().toLowerCase();
  const shown: string[] = !groups
    ? []
    : q
      ? groups.flatMap((g) => g.items).filter(([, s]) => s.includes(q)).slice(0, 160).map(([e]) => e)
      : tab === "recent"
        ? recent
        : (groups.find((g) => g.key === tab)?.items ?? []).map(([e]) => e);
  const tabs = [...(recent.length ? ["recent"] : []), ...Object.keys(ICONS).filter((k) => k !== "recent")];

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button" onClick={toggle} disabled={disabled} aria-expanded={open} aria-controls={open ? panelId : undefined}
        aria-label={t("open")} title={t("open")}
        className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-navy/5 hover:text-navy disabled:opacity-40 pointer-fine:size-9"
      >
        <Smile aria-hidden="true" size={17} />
      </button>
      {open && (
        <div
          id={panelId} role="dialog" aria-label={t("title")}
          className="fixed inset-x-3 bottom-3 z-40 flex flex-col sm:absolute sm:inset-x-auto sm:end-0 sm:bottom-auto sm:top-full sm:mt-1 sm:w-[22rem] gap-2 rounded-[14px] border border-line bg-card p-2 shadow-lg"
        >
          <label className="relative block">
            <span className="sr-only">{t("search")}</span>
            <Search aria-hidden="true" size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")}
              className="h-10 w-full rounded-[10px] border border-navy/15 bg-card ps-9 pe-3 text-[15px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15"
            />
          </label>
          {!q && (
            <div role="tablist" aria-label={t("title")} className="flex gap-0.5 overflow-x-auto">
              {tabs.map((k) => (
                <button
                  key={k} type="button" role="tab" aria-selected={tab === k} aria-label={t(`groups.${k}`)} title={t(`groups.${k}`)} onClick={() => setTab(k)}
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-lg ${tab === k ? "bg-blue/10" : "opacity-60 hover:opacity-100"}`}
                >
                  {ICONS[k]}
                </button>
              ))}
            </div>
          )}
          <p className="px-1 text-xs font-bold text-muted">{q ? t("results") : t(`groups.${tab}`)}</p>
          <div className="grid max-h-60 grid-cols-[repeat(auto-fill,minmax(40px,1fr))] overflow-y-auto">
            {!groups && <p className="col-span-full p-4 text-center text-sm text-muted">{t("loading")}</p>}
            {groups && shown.length === 0 && <p className="col-span-full p-4 text-center text-sm text-muted">{t("none")}</p>}
            {shown.map((e) => (
              <button key={e} type="button" onClick={() => pick(e)} className="inline-flex size-10 items-center justify-center rounded-lg text-[22px] hover:bg-navy/5 focus-visible:bg-navy/5">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
