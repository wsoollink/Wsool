import type { Template } from "@/generated/prisma/enums";

/**
 * Plans and limits in one place (CLAUDE.md section 6). The owner will review
 * the Free/Pro split, so change limits here only.
 */
export const TRIAL_DAYS = 14;

export const FREE_LIMITS = {
  /** Past works shown on the page. */
  portfolioItems: 6,
  /** Templates a Free page can use; others fall back to the first one. */
  templates: ["white", "black"] as readonly Template[],
  verifiedBadge: false,
  analytics: false,
  pdf: false,
  /** Free pages always show the "Made with Wsool" footer. */
  hideBranding: false,
} as const;

/** Whole days left until `trialEndsAt` (0 once it has passed). */
export function trialDaysLeft(trialEndsAt: Date | null | undefined, now = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
}
