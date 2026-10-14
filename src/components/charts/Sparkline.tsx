import { useId } from "react";
import { smoothPath } from "./path";

/** Tiny trend line with a soft fill (KPI tiles). Decorative: the number next to it carries the meaning. */
export function Sparkline({ values, className = "h-[34px] w-24" }: { values: number[]; className?: string }) {
  const id = useId();
  if (values.length < 2) return null;
  const { line, area } = smoothPath(values, 120, 36, Math.max(1, ...values) * 1.1);
  return (
    <svg viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true" className={`shrink-0 overflow-visible text-blue ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity=".2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
