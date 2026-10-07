import "server-only";
import { TRIAL_DAYS } from "@/config/plans";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";

/**
 * Creates the user's row on first sign-in, with the automatic Pro trial
 * (no card). Later sign-ins only keep the email in sync.
 */
export async function ensureAccount(user: CurrentUser) {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      subscription: { create: { plan: "pro", status: "trialing", trialEndsAt } },
    },
    update: { email: user.email },
  });
}
