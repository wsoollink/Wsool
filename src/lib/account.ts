import "server-only";
import { TRIAL_DAYS } from "@/config/plans";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { REF_COOKIE } from "@/config/referrals";
import { notify } from "@/lib/notify";
import { attachReferral } from "@/lib/referrals";

/**
 * Creates the user's row on first sign-in, with the automatic Pro trial
 * (no card), tied to the referring creator when there is one. Later
 * sign-ins only keep the email in sync.
 */
export async function ensureAccount(user: CurrentUser) {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const existed = await db.user.findUnique({ where: { id: user.id }, select: { id: true } });

  const row = await db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      subscription: { create: { plan: "pro", status: "trialing", trialEndsAt } },
    },
    update: { email: user.email },
  });
  if (!existed) {
    // Affiliate program: a referral link opened in the last 30 days ties this new account to its creator.
    try {
      await attachReferral(db, user, (await cookies()).get(REF_COOKIE)?.value);
    } catch (err) {
      console.error("[referrals] attach failed", err);
    }
    await notify(user.id, "welcome", {}, { dedupeKey: "welcome" });
  }
  return row;
}
