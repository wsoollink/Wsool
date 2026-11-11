import "server-only";
import { PRICES } from "@/config/plans";
import { db } from "@/lib/db";
import { codeStatus, discountedPrice, generateCode } from "@/lib/discounts";

/**
 * End-of-trial offer (owner, Nov 2026): with the day-10 trial reminder each creator gets their own code,
 * TRIAL_OFFER.percent off the YEARLY plan's first payment, locked to their email, valid TRIAL_OFFER.days days
 * (so a few days past the trial's end). The day-13 and trial-ended emails repeat the same code; the Subscription
 * page applies it by itself. The owner switches it on/off in admin/discounts (app_settings "trial_offer").
 */
export const TRIAL_OFFER = { percent: 20, cycle: "yearly" as const, days: 7 };
const SETTING = "trial_offer";
/** Shown in the admin codes list (the note column). */
export const TRIAL_OFFER_NOTE = "عرض نهاية التجربة · Trial offer";

/** On unless the owner switched it off. */
export async function trialOfferEnabled() {
  const row = await db.appSetting.findUnique({ where: { key: SETTING } });
  return row ? (row.value as { on?: boolean }).on !== false : true;
}

export async function setTrialOfferEnabled(on: boolean) {
  await db.appSetting.upsert({ where: { key: SETTING }, create: { key: SETTING, value: { on } }, update: { value: { on } } });
}

export type TrialOffer = { code: string; percent: number; expiresAt: Date };

/** The creator's offer code while it can still be used (not used, revoked or expired), else null. */
export async function activeTrialOffer(userId: string, now = new Date()): Promise<TrialOffer | null> {
  const row = await db.discountCode.findUnique({ where: { offerUserId: userId } });
  if (!row || codeStatus(row, now) !== "unused") return null;
  return { code: row.code, percent: row.percent, expiresAt: row.expiresAt };
}

/**
 * The offer for a creator still on their trial: the existing one, or a new code (only while the offer is on).
 * Never for suspended or placeholder accounts. One per account ever (unique offer_user_id), so an expired or
 * used offer is not made again.
 */
export async function ensureTrialOffer(userId: string, now = new Date()): Promise<TrialOffer | null> {
  const existing = await db.discountCode.findUnique({ where: { offerUserId: userId } });
  if (existing) return codeStatus(existing, now) === "unused" ? { code: existing.code, percent: existing.percent, expiresAt: existing.expiresAt } : null;
  if (!(await trialOfferEnabled())) return null;
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, suspendedAt: true, placeholder: true } });
  if (!user || user.suspendedAt || user.placeholder) return null;
  const expiresAt = new Date(now.getTime() + TRIAL_OFFER.days * 86_400_000);
  for (let i = 0; i < 5; i++) {
    try {
      const row = await db.discountCode.create({
        data: {
          code: generateCode(), percent: TRIAL_OFFER.percent, onlyCycle: TRIAL_OFFER.cycle, audience: "creators",
          email: user.email.toLowerCase(), note: TRIAL_OFFER_NOTE, createdBy: userId, offerUserId: userId, expiresAt,
        },
      });
      return { code: row.code, percent: row.percent, expiresAt: row.expiresAt };
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
      // Another run made this account's offer at the same moment: use it. Else the random code collided: try again.
      const made = await db.discountCode.findUnique({ where: { offerUserId: userId } });
      if (made) return codeStatus(made, now) === "unused" ? { code: made.code, percent: made.percent, expiresAt: made.expiresAt } : null;
    }
  }
  return null;
}

/** What the emails show: the code, its last day and the yearly price before/after, in the page's currency. */
export function offerEmailData(offer: TrialOffer, lang: "ar" | "en") {
  const currency = lang === "en" ? "USD" : "SAR";
  const full = PRICES[currency][TRIAL_OFFER.cycle];
  return { code: offer.code, percent: offer.percent, offerDate: offer.expiresAt.toISOString(), amount: discountedPrice(full, offer.percent), oldAmount: full, currency };
}
