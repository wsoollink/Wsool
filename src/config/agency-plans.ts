import type { AgencyPlan } from "@/generated/prisma/enums";

/**
 * Agency plans (owner, Nov 2026). Prices and names shown to agencies come from the `Agencies.plans` messages (same as the
 * /agencies landing page); this file holds the rules. Online payment for agencies isn't built yet: the owner sets the plan in
 * admin/agencies after the agency pays (the agency asks from its Subscription tab).
 */
export const AGENCY_PLANS = ["trial", "starter", "growth", "custom"] as const satisfies readonly AgencyPlan[];

/** Linked + invited creators allowed (null = no limit: the free beta and custom deals). */
export const AGENCY_CREATOR_LIMIT: Record<AgencyPlan, number | null> = { trial: null, starter: 10, growth: 30, custom: null };

/** Index of each paid plan in `Agencies.plans` (landing page cards). */
export const AGENCY_PLAN_CARD: Partial<Record<AgencyPlan, number>> = { starter: 0, growth: 1, custom: 2 };
