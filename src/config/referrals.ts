/**
 * Affiliate program (owner, Oct 2026). Pro creators share wsool.link/?ref=<username>;
 * they earn a share of what each customer they bring pays in their first year.
 */
export const REFERRAL = {
  /** Commission on each paid invoice, before VAT. */
  percent: 20,
  /** Payments within this many months of the customer's first payment earn a commission. */
  months: 12,
  /** How long a click on the link counts for the creator. */
  cookieDays: 30,
  /** A commission becomes payable after this many days (a refund before then cancels it). */
  holdDays: 14,
  /** Bank transfers are made once the payable balance reaches this (SAR). */
  minBankPayout: 100,
} as const;

/** Cookie set by /api/ref: "<referrer user id>.<click time ms>". */
export const REF_COOKIE = "wsool_ref";
/** Query parameter of the referral link. */
export const REF_PARAM = "ref";
