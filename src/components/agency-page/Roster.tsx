"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { VerifiedBadge } from "@/components/creator/VerifiedBadge";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Locale } from "@/i18n/config";
import type { AgencyCreator } from "@/lib/agency-page";
import { formatCompact } from "@/lib/format";
import { initials } from "@/lib/initials";

const fold = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

/** The agency's creators: search + category chips (only when there's something to filter), then the card grid. */
export function Roster({ creators, lang }: { creators: AgencyCreator[]; lang: Locale }) {
  const t = useTranslations("AgencyPage");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const cats = useMemo(() => [...new Set(creators.flatMap((c) => c.categoryNames))], [creators]);
  const shown = creators.filter((c) => {
    if (cat && !c.categoryNames.includes(cat)) return false;
    if (!q.trim()) return true;
    const hay = fold(`${c.name} ${c.specialty} ${c.username}`);
    return fold(q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  });

  return (
    <div className="flex flex-col gap-6">
      {creators.length > 6 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex min-h-12 items-center md:w-80">
            <span className="sr-only">{t("search")}</span>
            <Search aria-hidden="true" size={18} className="pointer-events-none absolute start-4 text-[var(--ag-muted)]" />
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")}
              className="h-12 w-full rounded-full border border-[var(--ag-line)] bg-[var(--ag-surface)] ps-11 pe-4 text-[16px] text-[var(--ag-ink)] outline-none placeholder:text-[var(--ag-muted)] focus-visible:border-[var(--ag-accent)] focus-visible:ring-2 focus-visible:ring-[var(--ag-accent-soft)]"
            />
          </label>
          {cats.length > 1 && (
            <div role="group" aria-label={t("navCreators")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {[null, ...cats].map((c) => (
                <button
                  key={c ?? "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${cat === c ? "border-transparent bg-[var(--ag-ink)] text-[var(--ag-bg)]" : "border-[var(--ag-line)] bg-[var(--ag-surface)] text-[var(--ag-ink)] hover:border-[var(--ag-accent)]"}`}
                >
                  {c ?? t("all")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--ag-line)] p-8 text-center text-[var(--ag-muted)]">{creators.length ? t("noMatch") : t("rosterSub", { n: 0 })}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((c) => (
            <li key={c.pageId}>
              <a href={`/${c.username}`} aria-label={t("viewPage", { name: c.name })} className="group flex flex-col gap-3 rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--ag-accent)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--ag-accent-soft)]">
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- creator photos from storage, any size
                    <img src={c.photoUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
                  ) : (
                    <span aria-hidden="true" className="flex size-full items-center justify-center text-4xl font-black text-[var(--ag-accent)] uppercase">{initials(c.name)}</span>
                  )}
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  {c.categoryNames[0] && (
                    <span className="absolute start-3 top-3 max-w-[80%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-bold text-[#0F0F0F] backdrop-blur">{c.categoryNames[0]}</span>
                  )}
                  <div className="absolute inset-x-3 bottom-3 text-white">
                    <p className="flex items-center gap-1.5 text-[15px] leading-tight font-bold sm:text-base">
                      <span className="truncate">{c.name}</span>
                      {c.verified && <VerifiedBadge size={16} />}
                    </p>
                    {c.specialty && <p className="mt-0.5 truncate text-[12.5px] text-white/80">{c.specialty}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1.5 px-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  {c.followers !== null ? (
                    <p className="flex items-baseline gap-1">
                      <span className="font-numbers text-lg font-black text-[var(--ag-ink)]" dir="ltr">{formatCompact(c.followers, lang)}</span>
                      <span className="text-xs text-[var(--ag-muted)]">{t("followers")}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--ag-muted)]">{t("private")}</p>
                  )}
                  <span className="flex items-center gap-1.5 text-[var(--ag-muted)]">
                    {c.platforms.slice(0, 4).map((p) => (
                      <span key={p} title={PLATFORM_NAMES[p]}><PlatformIcon platform={p} size={15} /></span>
                    ))}
                    {c.platforms.length > 4 && <span className="text-[11px] font-bold" dir="ltr">+{c.platforms.length - 4}</span>}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
