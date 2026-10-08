import { verificationDisplay } from "@/config/verification";
import type { RequestStatus, VerificationStatus, Platform } from "@/generated/prisma/enums";
import type { VerifyAccount } from "./VerificationList";

type Row = {
  id: string;
  platform: Platform;
  handle: string;
  followers: number;
  verificationStatus: VerificationStatus;
  verifiedUntil: Date | null;
  /** Latest pending/approved/rejected request, newest first. */
  verificationRequests: { status: RequestStatus; reason: string | null; createdAt: Date }[];
};

/** What the Verification section shows for each account, as of `now`. */
export function toVerifyAccounts(accounts: Row[], now = Date.now()): VerifyAccount[] {
  return accounts.map((a) => {
    const latest = a.verificationRequests[0];
    return {
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      followers: a.followers,
      status: verificationDisplay(a.verificationStatus, a.verifiedUntil, now),
      verifiedUntil: a.verifiedUntil?.toISOString() ?? null,
      daysLeft: a.verifiedUntil ? Math.max(0, Math.ceil((a.verifiedUntil.getTime() - now) / 86_400_000)) : 0,
      pendingSince: latest?.status === "pending" ? latest.createdAt.toISOString() : null,
      rejectReason: latest?.status === "rejected" ? latest.reason : null,
    };
  });
}
