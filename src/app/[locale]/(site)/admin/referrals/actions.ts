"use server";

import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { referralBalance } from "@/lib/referrals";

const input = z.object({ userId: z.uuid(), reference: z.string().trim().max(120).default("") });

export type PayoutResult = { ok?: boolean; amount?: number; error?: "invalid" | "nothing" | "not_bank" | "failed" };

/**
 * Records a bank transfer the owner made: the creator's whole payable balance,
 * with the transfer reference. Locked per creator so a double click can't pay
 * twice. Audited; the creator is told by notification and email.
 */
export async function recordBankPayout(raw: z.input<typeof input>): Promise<PayoutResult> {
  const admin = await requireAdmin("referrals.manage");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { error: "invalid" };
  const { userId, reference } = parsed.data;
  try {
    const res = await db.$transaction(async (tx) => {
      const [account] = await tx.$queryRaw<{ payout_method: string; iban: string | null }[]>`
        SELECT payout_method::text, iban FROM referral_accounts WHERE user_id = ${userId}::uuid FOR UPDATE`;
      if (!account || account.payout_method !== "bank" || !account.iban) return { error: "not_bank" as const };
      const { available } = await referralBalance(userId, tx);
      if (available <= 0) return { error: "nothing" as const };
      const note = [`IBAN ••${account.iban.slice(-4)}`, reference].filter(Boolean).join(" · ").slice(0, 200);
      await tx.referralPayout.create({ data: { referrerId: userId, method: "bank", amount: available, note, createdBy: admin.userId } });
      const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true, page: { select: { username: true } } } });
      await audit(admin, "referral.payout", { type: "user", id: userId }, { amount: available.toFixed(2), username: user?.page?.username ?? user?.email ?? "", reference }, tx);
      return { ok: true as const, amount: available };
    });
    if ("ok" in res) await notify(userId, "commission_paid", { amount: res.amount, currency: "SAR" });
    return res;
  } catch (err) {
    console.error("[referrals] payout failed", err);
    return { error: "failed" };
  }
}
