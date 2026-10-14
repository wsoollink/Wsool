import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/Sparkline";

export type Kpi = {
  label: string;
  icon?: ReactNode;
  value: string;
  /** Colour of the value (e.g. a loss in red). */
  valueTone?: "good" | "warn" | "bad";
  /** Change vs the previous period, e.g. "+12%" (kept left-to-right) and its colour. */
  delta?: { text: string; tone: "good" | "warn" | "muted" };
  /** Muted text after the delta ("vs last month") or on its own. */
  note?: string;
  spark?: number[];
};

const toneClass = { good: "text-good", warn: "text-warn", bad: "text-bad", muted: "text-muted" };
const mdCols = { 3: "md:grid-cols-3", 4: "md:grid-cols-4" } as const;
const mdSpan = ["", "", "md:col-span-2", "md:col-span-3", "md:col-span-4"];

/**
 * Key numbers in one bordered strip (Stripe-style), cells split by hairlines:
 * 2 per row on phones; from md all in one row, or `columns` per row. The last
 * cell stretches to fill its row.
 */
export function KpiStrip({ items, columns }: { items: Kpi[]; columns?: 3 | 4 }) {
  const n = items.length;
  const perRow = columns ?? n;
  const lastSpan = n % perRow ? perRow - (n % perRow) + 1 : 1;
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line-soft shadow-card ${columns ? mdCols[columns] : "md:grid-cols-[repeat(auto-fit,minmax(0,1fr))]"}`}
    >
      {items.map((k, i) => (
        <div
          key={k.label}
          className={`flex min-w-0 flex-col gap-0.5 bg-card px-3.5 pt-3.5 pb-3 md:px-5 md:pt-4 ${i === n - 1 ? `${n % 2 ? "max-md:col-span-2" : ""} ${mdSpan[lastSpan] ?? ""}` : ""}`}
        >
          <span className="flex items-center gap-1.5 text-[12.5px] text-muted [&_svg]:shrink-0">{k.icon}{k.label}</span>
          <div className="flex items-end justify-between gap-2">
            <span dir="ltr" className={`truncate font-numbers text-[22px] leading-snug tabular-nums md:text-[26px] ${k.valueTone ? toneClass[k.valueTone] : ""}`}>{k.value}</span>
            {k.spark && <Sparkline values={k.spark} className="h-[30px] w-14 md:h-[34px] md:w-24" />}
          </div>
          {(k.delta || k.note) && (
            <span className="truncate text-xs">
              {k.delta && <bdi dir="ltr" className={`font-semibold ${toneClass[k.delta.tone]}`}>{k.delta.text}</bdi>}
              {k.delta && k.note && " "}
              {k.note && <span className="text-muted">{k.note}</span>}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
