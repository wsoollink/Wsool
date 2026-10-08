import type { ReactNode } from "react";

type Props = { children: ReactNode; ariaLabel: string; seconds?: number };

/**
 * Auto-scrolling row (CSS only). The items render twice so the loop is
 * seamless; the copy is hidden from screen readers and keyboard. It pauses
 * on hover/focus, and falls back to a normal scrollable row for visitors
 * who prefer reduced motion.
 */
export function Marquee({ children, ariaLabel, seconds = 30 }: Props) {
  return (
    <div className="marquee group overflow-x-auto pb-1 motion-safe:overflow-hidden" role="region" aria-label={ariaLabel}>
      <div
        className="flex w-max gap-3 motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
        style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}
      >
        <ul className="flex shrink-0 gap-3">{children}</ul>
        <ul className="hidden shrink-0 gap-3 motion-safe:flex" aria-hidden="true" inert>
          {children}
        </ul>
      </div>
    </div>
  );
}
