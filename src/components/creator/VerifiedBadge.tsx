import { BADGE_CHECK, BADGE_PATH, VERIFIED_BLUE } from "@/lib/verified-badge";

/** Meta-style verified badge (blue wavy circle, white check). `label` = screen-reader text; none = decorative. */
export function VerifiedBadge({ size = 20, label, className = "" }: { size?: number; label?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={BADGE_PATH} fill={VERIFIED_BLUE} />
      <path d={BADGE_CHECK} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
