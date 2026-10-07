/**
 * Plans and limits in one place (CLAUDE.md section 6). The owner will review
 * the Free/Pro split, so change limits here only.
 */
export const TRIAL_DAYS = 14;

/** Whole days left until `trialEndsAt` (0 once it has passed). */
export function trialDaysLeft(trialEndsAt: Date | null | undefined, now = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
}
