/** Verification rules (CLAUDE.md section 7). */

/** A verification is valid this long after approval. */
export const VERIFICATION_DAYS = 90;
/** "Expiring soon" (and the reminder) starts this many days before expiry. */
export const EXPIRY_WARNING_DAYS = 7;
/** Staff aim to review within this many hours (shown to the creator). */
export const REVIEW_HOURS = 48;

/** All three must be ticked before staff can approve. */
export const REVIEW_CHECKS = ["username", "followers", "authentic"] as const;

/** Preset rejection reasons (sent to the creator). */
export const REJECT_REASONS = ["username_missing", "followers_mismatch", "unclear", "edited", "not_owner", "other_account"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export type DisplayStatus = "none" | "in_review" | "verified" | "expiring" | "expired" | "rejected";

/** What the creator and staff see, derived from the stored status and dates. */
export function verificationDisplay(status: string, verifiedUntil: Date | null, now = Date.now()): DisplayStatus {
  if (status === "in_review") return "in_review";
  if (status === "rejected") return "rejected";
  if (status !== "verified" || !verifiedUntil) return "none";
  const left = verifiedUntil.getTime() - now;
  if (left <= 0) return "expired";
  return left <= EXPIRY_WARNING_DAYS * 86_400_000 ? "expiring" : "verified";
}

/** Preset reasons for rejecting a license file. */
export const LICENSE_REJECT_REASONS = ["license_unclear", "license_mismatch", "license_expired", "license_edited"] as const;
