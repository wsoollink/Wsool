import type { ReactNode } from "react";

export type Tone = "good" | "warn" | "bad" | "blue" | "grey";

const tones: Record<Tone, string> = {
  good: "bg-good/10 text-good",
  warn: "bg-warn/10 text-warn",
  bad: "bg-bad/10 text-bad",
  blue: "bg-blue/10 text-blue",
  grey: "bg-hover text-muted",
};

/** Small status badge (Stripe-style): soft background in the status colour, optional leading dot. */
export function Pill({ tone = "grey", dot = true, className = "", children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-px text-[11.5px] font-semibold whitespace-nowrap ${tones[tone]} ${className}`}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
