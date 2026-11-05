import type { AgencyPlan, BillingCycle, Currency } from "@/generated/prisma/enums";

/**
 * Agency plans (owner, Nov 2026). Names shown to agencies come from the `Agencies.plans` messages (same as the /agencies
 * landing page); this file holds the rules and the prices charged online (src/lib/agency-billing.ts). The owner can still
 * set any plan by hand in admin/agencies (custom deals, bank transfers).
 */
export const AGENCY_PLANS = ["trial", "starter", "growth", "custom"] as const satisfies readonly AgencyPlan[];

/** Linked + invited creators allowed (null = no limit: the free beta and custom deals). */
export const AGENCY_CREATOR_LIMIT: Record<AgencyPlan, number | null> = { trial: null, starter: 10, growth: 30, custom: null };

/** Index of each paid plan in `Agencies.plans` (landing page cards). */
export const AGENCY_PLAN_CARD: Partial<Record<AgencyPlan, number>> = { starter: 0, growth: 1, custom: 2 };

/** Free trial length for a new agency (owner can change the end date in admin/agencies). */
export const AGENCY_TRIAL_DAYS = 30;

/** Whole days left until `until` (0 on the last day, negative once past); null = no end date. */
export function agencyDaysLeft(until: Date | null, now = new Date()): number | null {
  if (!until) return null;
  return Math.ceil((until.getTime() - now.getTime()) / 86_400_000);
}

/** The plan ended (trial or paid): the agency can't invite new creators until it's renewed. */
export const agencyPlanExpired = (until: Date | null, now = new Date()) => !!until && until.getTime() < now.getTime();

/** Plans an agency can buy online (the large plan is a custom deal through WhatsApp). */
export const AGENCY_PAID_PLANS = ["starter", "growth"] as const;
export type AgencyPaidPlan = (typeof AGENCY_PAID_PLANS)[number];
export const isAgencyPaidPlan = (p: string): p is AgencyPaidPlan => (AGENCY_PAID_PLANS as readonly string[]).includes(p);

/** Prices charged online, VAT included (same as the /agencies landing page; yearly = 10 months). Arabic site SAR, English USD. */
export const AGENCY_PRICES: Record<Currency, Record<AgencyPaidPlan, Record<BillingCycle, number>>> = {
  SAR: { starter: { monthly: 299, yearly: 2990 }, growth: { monthly: 699, yearly: 6990 } },
  USD: { starter: { monthly: 79, yearly: 790 }, growth: { monthly: 186, yearly: 1860 } },
};

/** Days after the plan (or trial) ends before the agency's creators are unlinked (owner, Nov 2026). */
export const AGENCY_UNLINK_AFTER_DAYS = 30;

/** When the creators will be unlinked if the plan isn't renewed (null = open-ended plan). */
export const agencyUnlinkDate = (until: Date | null) => (until ? new Date(until.getTime() + AGENCY_UNLINK_AFTER_DAYS * 86_400_000) : null);
