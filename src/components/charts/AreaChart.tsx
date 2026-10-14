"use client";

import { useId, useState } from "react";
import { smoothPath } from "./path";

/** `text` = the tooltip value ("1,234 visits"); functions can't cross from server to client, so it is precomputed. */
export type ChartPoint = { label: string; value: number; prev?: number; text?: string };

type Props = {
  points: ChartPoint[];
  ariaLabel: string;
  /** Axis labels under the chart (first … last), left to right. */
  ticks?: string[];
  className?: string;
};

const W = 760;
const H = 220;

/**
 * Area chart from the redesign: the current period as a filled line, the
 * previous one dashed. Time runs left to right in both languages (growth
 * reads as going up-right). Hover / touch shows the day's value.
 */
export function AreaChart({ points, ariaLabel, ticks, className = "h-[200px] md:h-[220px]" }: Props) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const hasPrev = points.some((p) => p.prev !== undefined);
  const max = Math.max(1, ...points.map((p) => Math.max(p.value, p.prev ?? 0))) * 1.15;
  const cur = smoothPath(points.map((p) => p.value), W, H, max);
  const prev = hasPrev ? smoothPath(points.map((p) => p.prev ?? 0), W, H, max) : null;
  const n = points.length;
  const at = hover ?? null;
  const pct = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  };

  return (
    <div dir="ltr">
      <div role="img" aria-label={ariaLabel} className={`relative ${className}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="size-full overflow-visible text-blue">
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity=".18" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--color-line)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
          {prev && <path d={prev.line} fill="none" stroke="var(--color-faint)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
          <path d={cur.area} fill={`url(#${id})`} />
          <path d={cur.line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {at !== null && <line x1={cur.x(at)} x2={cur.x(at)} y1="0" y2={H} stroke="currentColor" strokeOpacity=".35" vectorEffect="non-scaling-stroke" />}
        </svg>
        {at !== null && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue bg-card" style={{ left: `${pct(at)}%`, top: `${(cur.y(points[at].value) / H) * 100}%` }} />
            <div
              aria-hidden="true"
              dir="auto" className="pointer-events-none absolute z-10 flex flex-col rounded-[10px] border border-line bg-card px-2.5 py-1.5 text-xs leading-snug whitespace-nowrap shadow-pop"
              style={{ left: `${pct(at)}%`, top: `${(cur.y(points[at].value) / H) * 100}%`, transform: `translate(${pct(at) > 80 ? "-100%" : pct(at) < 20 ? "0" : "-50%"}, calc(-100% - 12px))` }}
            >
              <b className="font-bold">{points[at].text ?? points[at].value}</b>
              <span className="text-[11px] text-muted">{points[at].label}</span>
            </div>
          </>
        )}
      </div>
      {ticks && (
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          {ticks.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      )}
    </div>
  );
}
