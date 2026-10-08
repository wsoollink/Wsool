"use client";

import { useEffect, useRef, useState } from "react";

type Props = { value: number; locale: string; className?: string; durationMs?: number };

/**
 * Animated count-up. The server renders the final number (good for SEO and
 * no-JS); in the browser it counts up once it scrolls into view.
 * Skipped for visitors who prefer reduced motion.
 */
export function CountUp({ value, locale, className, durationMs = 1400 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const format = new Intl.NumberFormat(locale);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) ** 3;
        setShown(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {/* Screen readers get the real number, not every animation frame. */}
      <span aria-hidden="true">{format.format(shown)}</span>
      <span className="sr-only">{format.format(value)}</span>
    </span>
  );
}
