import "server-only";
import { PRICES } from "@/config/plans";
import { PLATFORM_NAMES } from "@/config/platforms";
import { EXPIRY_WARNING_DAYS } from "@/config/verification";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { expirePage } from "@/lib/public-page";

const DAY = 86_400_000;
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Hourly reminders (CLAUDE.md sections 6 and 7). Each one has a dedupe key,
 * so running the job again never sends it twice:
 * - trial: day 10 (4 days left) and day 13 (1 day left); day 14 is the billing job
 * - yearly renewal: 7 days before
 * - verification: 7 days before it ends, and when it has ended (badge removed)
 */
export async function runReminders(now = new Date()) {
  let sent = 0;

  const trials = await db.subscription.findMany({
    where: { status: "trialing", trialEndsAt: { gt: now, lte: new Date(now.getTime() + 4 * DAY) } },
    select: { userId: true, trialEndsAt: true },
  });
  for (const t of trials) {
    const days = Math.ceil((t.trialEndsAt!.getTime() - now.getTime()) / DAY);
    const key = days <= 1 ? "trial_day13" : "trial_day10";
    await notify(t.userId, "trial_reminder", { days: Math.max(1, days), endDate: t.trialEndsAt!.toISOString() }, { dedupeKey: key });
    sent++;
  }

  const yearly = await db.subscription.findMany({
    where: { status: "active", cycle: "yearly", cancelAtPeriodEnd: false, currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + 7 * DAY) } },
    select: { userId: true, currentPeriodEnd: true, currency: true },
  });
  for (const s of yearly) {
    if (!s.currency) continue;
    await notify(s.userId, "renewal_upcoming", { renewDate: s.currentPeriodEnd!.toISOString(), amount: PRICES[s.currency].yearly, currency: s.currency }, { dedupeKey: `renewal_${dateKey(s.currentPeriodEnd!)}` });
    sent++;
  }

  const verified = await db.socialAccount.findMany({
    where: { verificationStatus: "verified", verifiedUntil: { lte: new Date(now.getTime() + EXPIRY_WARNING_DAYS * DAY) } },
    select: { id: true, platform: true, handle: true, verifiedUntil: true, page: { select: { userId: true, username: true } } },
  });
  for (const a of verified) {
    const until = a.verifiedUntil!;
    const data = { platform: PLATFORM_NAMES[a.platform], handle: a.handle, untilDate: until.toISOString() };
    if (until > now) {
      await notify(a.page.userId, "verification_expiring", data, { dedupeKey: `verif_expiring_${a.id}_${dateKey(until)}` });
    } else {
      // The badge is gone: mark it, refresh the cached page and tell the creator once.
      await db.socialAccount.update({ where: { id: a.id }, data: { verificationStatus: "none", verifiedUntil: null } });
      expirePage(a.page.username);
      await notify(a.page.userId, "verification_expired", data, { dedupeKey: `verif_expired_${a.id}_${dateKey(until)}` });
    }
    sent++;
  }
  return sent;
}
