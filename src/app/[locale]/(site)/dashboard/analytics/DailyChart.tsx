"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/format";

const H = 160;

/**
 * Daily views as thin bars (one series, so no legend: the title names it).
 * Each bar is a hover/focus target with a tooltip; the same numbers are in the
 * table below, so nothing depends on hovering.
 */
export function DailyChart({ series }: { series: { day: string; views: number }[] }) {
  const t = useTranslations("Analytics");
  const lang = useLocale().slice(0, 2) as Locale;
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => d.views));
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (d: { day: string }) => date.format(new Date(`${d.day}T00:00:00Z`));
  const step = 100 / series.length;
  const gap = Math.min(0.6, step * 0.25);
  const ticks = [...new Set([0, Math.round(max / 2), max])];
  const current = active !== null ? series[active] : null;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-bold">{t("dailyViews")}</figcaption>
      <div className="relative ps-8" dir="ltr">
        {/* Recessive grid: three hairlines, values in their own gutter. */}
        <div className="pointer-events-none absolute inset-y-0 start-0 end-0" style={{ height: H }} aria-hidden="true">
          {ticks.map((v, i) => {
            const y = H - (v / max) * (H - 8);
            return (
              <div key={i} className="absolute inset-x-0 flex items-center" style={{ top: y }}>
                <span className="w-8 -translate-y-1/2 pe-1 text-end text-[10px] leading-none text-muted">{formatNumber(v, lang)}</span>
                <span className="flex-1 border-t border-line" />
              </div>
            );
          })}
        </div>
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="relative block w-full" style={{ height: H }} role="img" aria-label={t("dailyViews")}>
          {series.map((d, i) => {
            const h = d.views === 0 ? 0 : Math.max(2, (d.views / max) * (H - 8));
            return (
              <g key={d.day}>
                <rect x={i * step + gap / 2} y={H - h} width={step - gap} height={h} rx={0.6} className={active === i ? "fill-blue" : "fill-blue/80"} />
                {/* Hit target: the whole column, not only the painted bar. */}
                <rect
                  x={i * step} y={0} width={step} height={H} fill="transparent" tabIndex={0}
                  aria-label={`${label(d)}: ${formatNumber(d.views, lang)}`}
                  onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                  className="outline-none focus-visible:fill-navy/10"
                />
              </g>
            );
          })}
        </svg>
        {current && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line bg-card px-3 py-2 text-center shadow-card"
            style={{ left: `calc(2rem + (100% - 2rem) * ${Math.min(0.88, Math.max(0.12, ((active + 0.5) * step) / 100))})` }}
          >
            <p className="font-numbers text-base font-bold">{formatNumber(current.views, lang)}</p>
            <p className="text-xs text-muted">{label(current)}</p>
          </div>
        )}
      </div>
      <div className="flex justify-between ps-8 text-[10px] text-muted" dir="ltr" aria-hidden="true">
        <span>{label(series[0])}</span>
        <span>{label(series[series.length - 1])}</span>
      </div>
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer content-center text-blue">{t("showTable")}</summary>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-xs text-muted"><th scope="col" className="py-1 text-start font-medium">{t("day")}</th><th scope="col" className="py-1 text-end font-medium">{t("views")}</th></tr></thead>
          <tbody>
            {series.map((d) => (
              <tr key={d.day} className="border-t border-line"><td className="py-1">{label(d)}</td><td className="py-1 text-end">{formatNumber(d.views, lang)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
