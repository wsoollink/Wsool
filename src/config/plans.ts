import type { BillingCycle, Currency, Template } from "@/generated/prisma/enums";

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

type SubscriptionLike = { status: string; trialEndsAt: Date | null } | null | undefined;

/**
 * Pro = paid (active, or past_due while renewal retries run), or a trial that
 * hasn't ended yet. The billing job moves subscriptions out of these states.
 */
export function hasPro(sub: SubscriptionLike, now = Date.now()): boolean {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "past_due") return true;
  return sub.status === "trialing" && !!sub.trialEndsAt && sub.trialEndsAt.getTime() > now;
}

/**
 * Pro prices (CLAUDE.md section 6): fixed in every country, VAT included.
 * Arabic site in SAR, English site in USD.
 */
export const PRICES: Record<Currency, Record<BillingCycle, number>> = {
  SAR: { monthly: 49, yearly: 490 },
  USD: { monthly: 13, yearly: 130 },
};

/** Saudi VAT, included in every price. */
export const VAT_RATE = 0.15;

/** VAT part of a VAT-inclusive amount, rounded to cents. */
export function vatPart(total: number) {
  return Math.round((total - total / (1 + VAT_RATE)) * 100) / 100;
}

/** Renewal retries after a failed charge (days after the period end), then the plan drops to Free. */
export const RENEWAL_RETRY_DAYS = [1, 3] as const;

/** Adds one billing cycle (calendar month/year); Jan 31 + 1 month = Feb 28/29. */
export function addCycle(from: Date, cycle: BillingCycle) {
  const months = cycle === "monthly" ? 1 : 12;
  const y = from.getUTCFullYear(), m = from.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = new Date(from);
  d.setUTCFullYear(y, m, Math.min(from.getUTCDate(), lastDay));
  return d;
}
