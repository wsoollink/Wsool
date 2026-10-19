import "server-only";
import { FREE_LIMITS, hasPro, planLabel, trialDaysLeft } from "@/config/plans";
import { verificationDisplay } from "@/config/verification";
import type { Page } from "@/generated/prisma/client";
import { dailyCounts } from "@/lib/analytics-report";
import { today } from "@/lib/analytics";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/site-url";

const DAY = 86_400_000;

/** The signed-in user's plan, for the app header and the Subscription screen. */
export async function planSummary(userId: string) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  return {
    label: planLabel(sub),
    pro: hasPro(sub),
    status: sub?.status ?? "expired",
    cycle: sub?.cycle ?? null,
    trialDaysLeft: sub?.status === "trialing" ? trialDaysLeft(sub.trialEndsAt) : 0,
    periodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
  };
}

/**
 * Dashboard home for the app (same data as the website home): link, plan,
 * 30-day stats with the 30 days before (Pro), completion checklist and
 * verification per account. Raw values only: the app formats and translates.
 */
export async function homeData(userId: string, page: Page) {
  // Stats are fetched with everything else, before we know whether the plan shows them: one wait.
  const end = today();
  const statsData = Promise.all([
    dailyCounts(page.id, 60),
    db.pageView.groupBy({ by: ["country"], where: { pageId: page.id, day: { gte: new Date(end.getTime() - 29 * DAY) }, country: { not: null } }, _count: true, orderBy: { _count: { country: "desc" } }, take: 1 }),
  ]);
  statsData.catch(() => {}); // unused on Free pages: never an unhandled rejection
  const [plan, translations, accounts, counts, latestViews, unread] = await Promise.all([
    planSummary(userId),
    db.pageTranslation.findMany({ where: { pageId: page.id }, select: { lang: true, fullName: true, bio: true } }),
    db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { audience: { select: { id: true } }, _count: { select: { rates: true } } } }),
    db.page.findUnique({ where: { id: page.id }, select: { _count: { select: { tags: true, brandLogos: true, portfolioItems: true } } } }),
    db.monthlyView.findFirst({ where: { pageId: page.id }, orderBy: { month: "desc" } }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  const tr = translations.find((x) => x.lang === page.primaryLang) ?? translations[0];
  const c = counts?._count;

  let stats = null;
  if (plan.pro || FREE_LIMITS.analytics) {
    const [days, countries] = await statsData;
    const cur = days.slice(30), before = days.slice(0, 30);
    const sum = (rows: typeof days, k: "views" | "whatsapp" | "email") => rows.reduce((s, d) => s + d[k], 0);
    const views = sum(cur, "views");
    stats = {
      views, whatsapp: sum(cur, "whatsapp"), email: sum(cur, "email"),
      prev: { views: sum(before, "views"), whatsapp: sum(before, "whatsapp"), email: sum(before, "email") },
      topCountry: countries[0]?.country ? { code: countries[0].country, share: views ? Math.round((countries[0]._count / views) * 100) : 0 } : null,
      series: cur.map((d, i) => ({ day: d.day, views: d.views, prev: before[i]?.views ?? 0, whatsapp: d.whatsapp, email: d.email })),
    };
  }

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const lastNumbers = Math.max(0, ...accounts.map((a) => a.followersUpdatedAt?.getTime() ?? 0), latestViews?.month.getTime() ?? 0);

  return {
    name: tr?.fullName || null,
    username: page.username,
    url: `${siteOrigin()}/${page.username}`,
    published: page.isPublished,
    photoUrl: page.photoUrl,
    template: page.template,
    languages: page.enEnabled ? [page.primaryLang, page.primaryLang === "ar" ? "en" : "ar"] : [page.primaryLang],
    plan,
    unread,
    stats,
    numbersStale: accounts.length > 0 && lastNumbers < monthStart,
    completion: [
      { key: "photo", done: !!page.photoUrl, section: "edit" },
      { key: "bio", done: !!tr?.bio, section: "edit" },
      { key: "accounts", done: accounts.length > 0, section: "accounts" },
      { key: "tags", done: (c?.tags ?? 0) > 0, section: "edit" },
      { key: "brands", done: (c?.brandLogos ?? 0) > 0, section: "work" },
      { key: "work", done: (c?.portfolioItems ?? 0) > 0, section: "work" },
      { key: "rates", done: accounts.some((a) => a._count.rates > 0), section: "rates" },
      { key: "contact", done: !!(page.whatsapp || page.contactEmail), section: "contact" },
      { key: "audience", done: accounts.some((a) => a.audience), section: "accounts" },
      { key: "verify", done: accounts.some((a) => verificationDisplay(a.verificationStatus, a.verifiedUntil) !== "none"), section: "verification" },
    ],
    accounts: accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, followers: a.followers, verification: verificationDisplay(a.verificationStatus, a.verifiedUntil) })),
  };
}
