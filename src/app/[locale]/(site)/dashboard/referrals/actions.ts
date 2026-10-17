"use server";

import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { maskIban } from "@/lib/referrals";
import { payoutSchema, type PayoutInput } from "@/lib/validation/referrals";

export type PayoutResult = { ok?: boolean; maskedIban?: string | null; errors?: { iban?: boolean; holderName?: boolean } };

/**
 * Saves how the creator's commission is paid (credit on renewals or bank
 * transfer). An empty IBAN field keeps the saved one, so it never has to be
 * shown back in full.
 */
export async function savePayoutSettings(input: PayoutInput): Promise<PayoutResult> {
  const { user } = await requireCreator();
  const saved = await db.referralAccount.findUnique({ where: { userId: user.id }, select: { iban: true, holderName: true } });
  const keepIban = !input.iban?.trim() && !!saved?.iban;
  const parsed = payoutSchema.safeParse(keepIban ? { ...input, iban: saved!.iban! } : input);
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => i.path[0]));
    return { errors: { iban: fields.has("iban"), holderName: fields.has("holderName") } };
  }
  const data = parsed.data;
  await db.referralAccount.upsert({
    where: { userId: user.id },
    create: { userId: user.id, payoutMethod: data.method, iban: data.iban, holderName: data.holderName },
    update: { payoutMethod: data.method, iban: data.iban, holderName: data.holderName },
  });
  return { ok: true, maskedIban: maskIban(data.iban) };
}
