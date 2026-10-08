import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";

/** Cache tag to revalidate whenever a creator's public page data changes. */
export const pageCacheTag = (username: string) => `page:${username}`;

/**
 * Everything the public creator page shows, read on the server. Only public
 * fields are selected (never the owner's account email). Cached per username
 * and refreshed with revalidateTag(pageCacheTag(username)) after edits.
 */
export async function getPublicPage(username: string) {
  "use cache";
  cacheTag(pageCacheTag(username));

  const page = await db.page.findUnique({
    where: { username },
    select: {
      id: true, username: true, primaryLang: true, enEnabled: true, template: true,
      customColors: true, accent: true, numberFont: true, hideBranding: true,
      isPublished: true, deletedAt: true, photoUrl: true, whatsapp: true, contactEmail: true,
      user: { select: { subscription: { select: { plan: true, status: true, trialEndsAt: true } } } },
      translations: true,
      tags: { orderBy: { sort: "asc" } },
      licenses: { orderBy: { sort: "asc" } },
      socialAccounts: {
        orderBy: { sort: "asc" },
        include: { audience: true, rates: { orderBy: { sort: "asc" } } },
      },
      monthlyViews: { orderBy: { month: "desc" }, take: 1 },
      brandLogos: { orderBy: { sort: "asc" } },
      portfolioItems: { orderBy: { sort: "asc" }, include: { translations: true } },
      rateSettings: true,
      rateBundles: {
        orderBy: { sort: "asc" },
        include: { platforms: true, rates: { orderBy: { sort: "asc" } } },
      },
    },
  });

  if (!page || !page.isPublished || page.deletedAt) {
    cacheLife("hours");
    return page ? { status: "hidden" as const, username: page.username } : null;
  }

  const now = Date.now();
  const sub = page.user.subscription;
  const isPro = hasPro(sub, now);
  // A trial ending within the hour must not keep Pro features in the cache:
  // expire the entry when the trial ends. Next.js treats entries shorter than
  // 5 minutes as dynamic (breaks prerendering), so 5 minutes is the floor.
  const trialLeft = sub?.status === "trialing" && sub.trialEndsAt ? Math.ceil((sub.trialEndsAt.getTime() - now) / 1000) : Infinity;
  if (isPro && trialLeft < 3600) {
    const seconds = Math.max(300, trialLeft);
    cacheLife({ stale: 300, revalidate: seconds, expire: seconds });
  }
  else cacheLife("hours");

  return {
    status: "published" as const,
    username: page.username,
    primaryLang: page.primaryLang as Locale,
    enEnabled: page.enEnabled,
    // Free pages can only use the Free templates (CLAUDE.md section 6).
    template: isPro || FREE_LIMITS.templates.includes(page.template) ? page.template : FREE_LIMITS.templates[0],
    customColors: page.customColors,
    accent: page.accent,
    numberFont: page.numberFont,
    isPro,
    // Hiding the footer is a Pro feature unless the Free limits allow it.
    showBranding: !(page.hideBranding && (isPro || FREE_LIMITS.hideBranding)),
    photoUrl: page.photoUrl,
    whatsapp: page.whatsapp,
    contactEmail: page.contactEmail,
    translations: page.translations,
    tags: page.tags,
    licenses: page.licenses,
    accounts: page.socialAccounts.map((a) => {
      const until = a.verifiedUntil?.getTime() ?? 0;
      const verified = a.verificationStatus === "verified" && until > now;
      return {
        id: a.id,
        platform: a.platform,
        handle: a.handle,
        url: a.url,
        followers: a.followers,
        // The badge is a Pro feature (CLAUDE.md section 6).
        verified: verified && isPro,
        audience: a.audience,
        rates: a.rates.map((r) => ({ id: r.id, name: r.name, nameEn: r.nameEn, price: Number(r.price) })),
      };
    }),
    monthlyViews: page.monthlyViews[0] ? Number(page.monthlyViews[0].views) : null,
    brandLogos: page.brandLogos,
    portfolio: isPro ? page.portfolioItems : page.portfolioItems.slice(0, FREE_LIMITS.portfolioItems),
    // No saved settings yet = the defaults (shown, VAT included, SAR or USD by primary language).
    rateSettings: page.rateSettings ?? { showOnPage: true, showInPdf: true, currency: page.primaryLang === "en" ? ("USD" as const) : ("SAR" as const), vatIncluded: true },
    bundles: page.rateBundles.map((b) => ({
      id: b.id,
      name: b.name,
      nameEn: b.nameEn,
      accountIds: b.platforms.map((p) => p.accountId),
      rates: b.rates.map((r) => ({ id: r.id, name: r.name, nameEn: r.nameEn, price: Number(r.price) })),
    })),
  };
}

export type PublicPage = NonNullable<Awaited<ReturnType<typeof getPublicPage>>>;
export type PublishedPage = Extract<PublicPage, { status: "published" }>;
