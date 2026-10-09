import type { HTMLAttributes } from "react";

/** Frosted dashboard card (design: radius 18, translucent white, soft border, top highlight). */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-navy/8 bg-white/72 p-[18px] shadow-card backdrop-blur-[14px] ${className}`}
      {...props}
    />
  );
}
