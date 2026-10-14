import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/Sparkline";

export type Kpi = {
  label: string;
  icon?: ReactNode;
  value: string;
  /** Change vs the previous period, e.g. "+12%" (kept left-to-right) and its colour. */
  delta?: { text: string; tone: "good" | "warn" | "muted" };
  /** Muted text after the delta ("vs last month") or on its own. */
  note?: string;
  spark?: number[];
};

const toneClass = { good: "text-good", warn: "text-warn", muted: "text-muted" };

/** Row of key numbers in one bordered strip (Stripe-style): 2 per row on phones, all in one row from md. */
export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-card border border-line bg-card shadow-card md:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
      {items.map((k, i) => (
        <div
          key={k.label}
          className={`flex min-w-0 flex-col gap-0.5 px-3.5 pt-3.5 pb-3 md:px-5 md:pt-4 ${i % 2 ? "border-s border-line-soft" : ""} ${i >= 2 ? "max-md:border-t max-md:border-line-soft" : ""} ${i && !(i % 2) ? "md:border-s md:border-line-soft" : ""} ${items.length % 2 && i === items.length - 1 ? "max-md:col-span-2" : ""}`}
        >
          <span className="flex items-center gap-1.5 text-[12.5px] text-muted [&_svg]:shrink-0">{k.icon}{k.label}</span>
          <div className="flex items-end justify-between gap-2">
            <span dir="ltr" className="truncate font-numbers text-[22px] leading-snug tabular-nums md:text-[26px]">{k.value}</span>
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
