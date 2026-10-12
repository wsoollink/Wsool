"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = { children: ReactNode; ariaLabel: string; seconds?: number };

/**
 * Auto-scrolling row (CSS animation). It only moves when the items are wider
 * than the row: then they render twice so the loop is seamless (the copy is
 * hidden from screen readers and keyboard). A few items that fit stay still
 * and are shown once. It pauses on hover/focus, and falls back to a normal
 * scrollable row for visitors who prefer reduced motion. As in the design it
 * runs to the screen edges on mobile with faded ends.
 */
export function Marquee({ children, ariaLabel, seconds = 30 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const check = () => {
      if (box.current && list.current) setMoving(list.current.scrollWidth > box.current.clientWidth);
    };
    check();
    const observer = new ResizeObserver(check);
    if (box.current) observer.observe(box.current);
    if (list.current) observer.observe(list.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={`marquee group -mx-5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0 ${moving ? "[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] motion-safe:overflow-hidden" : ""}`}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        className={`flex w-max gap-3 ${moving ? "motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]" : ""}`}
        style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}
      >
        <ul ref={list} className="flex shrink-0 gap-3">{children}</ul>
        {moving && (
          <ul className="hidden shrink-0 gap-3 motion-safe:flex" aria-hidden="true" inert>
            {children}
          </ul>
        )}
      </div>
    </div>
  );
}
