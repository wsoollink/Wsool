import "server-only";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { parseCustomColors } from "@/components/creator/theme";
import type { Locale } from "@/i18n/config";
import type { Page } from "@/generated/prisma/client";
import { listCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { pageLanguages } from "@/lib/page-language";
import { nextUsernameChange } from "@/lib/username";
import { ACCENT_SWATCHES } from "@/lib/validation/appearance";
import { siteOrigin } from "@/lib/site-url";
import { toVerifyAccounts } from "@/app/[locale]/(site)/dashboard/verification/accounts";
import { analyticsReport, periodTotals, RANGES, type Range } from "@/lib/analytics-report";
import { today } from "@/lib/analytics";
import { REFERRAL } from "@/config/referrals";
import { maskIban, referralBalance, referralLink } from "@/lib/referrals";
import { planLabel, trialDaysLeft } from "@/config/plans";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";
import { invoiceLabel } from "@/lib/billing";

/**
 * What each dashboard section's editor starts from (the same data the website
 * pages pass to their editors), for the mobile app. Raw values: the app
 * formats and translates. Saving goes through /api/mobile/v1/rpc.
 */
const pro = async (userId: string) => hasPro(await db.subscription.findUnique({ where: { userId }, select: { status: true, trialEndsAt: true } }));
const langsOf = (page: Page) => ({ primary: page.primaryLang as Locale, enEnabled: page.enEnabled, langs: pageLanguages(page.primaryLang as Locale, page.enEnabled), showEnglish: page.primaryLang === "ar" && page.enEnabled });
const rate = (r: { name: string; nameEn: string | null; price: unknown }) => ({ name: r.name, nameEn: r.nameEn ?? "", price: Number(r.price) });

const LOADERS = {
  async edit(page: Page) {
    const [translations, tags, licenses, categories, picked] = await Promise.all([
      db.pageTranslation.findMany({ where: { pageId: page.id } }),
      db.tag.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
      db.license.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
      listCategories(),
      db.pageCategory.findMany({ where: { pageId: page.id }, select: { categoryId: true } }),
    ]);
    const empty = { fullName: "", specialty: "", bio: "", city: "", country: "" };
    const text = (lang: Locale) => {
      const tr = translations.find((x) => x.lang === lang);
      return tr ? { fullName: tr.fullName, specialty: tr.specialty, bio: tr.bio, city: tr.city, country: tr.country } : empty;
    };
    return {
      ...langsOf(page),
      username: page.username,
      url: `${siteOrigin()}/${page.username}`,
      published: page.isPublished,
      nextUsernameChange: nextUsernameChange(page.usernameChangedAt)?.toISOString() ?? null,
      photoUrl: page.photoUrl, photoShape: page.photoShape, logoUrl: page.logoUrl,
      texts: { ar: text("ar"), en: text("en") },
      categories, pickedCategories: picked.map((p) => p.categoryId),
      tags: { ar: tags.filter((x) => x.lang === "ar").map((x) => x.label), en: tags.filter((x) => x.lang === "en").map((x) => x.label) },
      licenses: licenses.map((l) => ({ name: l.name, nameEn: l.nameEn ?? "", number: l.number, fileUrl: l.fileUrl, verificationStatus: l.verificationStatus })),
    };
  },
  async accounts(page: Page) {
    const [accounts, views, isPro] = await Promise.all([
      db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { audience: true } }),
      db.monthlyView.findFirst({ where: { pageId: page.id }, orderBy: { month: "desc" } }),
      pro(page.userId),
    ]);
    const byAccount = (views?.byAccount ?? {}) as Record<string, number>;
    return {
      accounts: accounts.map((a) => ({
        id: a.id, platform: a.platform, handle: a.handle, followers: a.followers, link: a.url, verificationStatus: a.verificationStatus,
        views: typeof byAccount[a.id] === "number" ? byAccount[a.id] : null,
        audience: a.audience ? { gender: a.audience.gender ?? [], ages: a.audience.ages ?? [], countries: a.audience.countries ?? [], cities: a.audience.cities ?? [] } : null,
      })),
      viewsMonth: views?.month.toISOString() ?? null,
      audienceLocked: !isPro && !FREE_LIMITS.audience,
    };
  },
  async work(page: Page) {
    const [brands, works, isPro] = await Promise.all([
      db.brandLogo.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
      db.portfolioItem.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { translations: true } }),
      pro(page.userId),
    ]);
    const text = (w: (typeof works)[number], lang: Locale) => {
      const tr = w.translations.find((x) => x.lang === lang);
      return { brand: tr?.brand ?? "", type: tr?.type ?? "" };
    };
    return {
      ...langsOf(page),
      freeLimit: isPro ? null : FREE_LIMITS.portfolioItems,
      brands: brands.map((b) => ({ name: b.name, url: b.logoUrl })),
      works: works.map((w) => ({ platform: w.platform, videoUrl: w.videoUrl, linkUrl: w.linkUrl, thumbUrl: w.thumbUrl, ar: text(w, "ar"), en: text(w, "en") })),
    };
  },
  async rates(page: Page) {
    const [settings, accounts, bundles, isPro] = await Promise.all([
      db.rateSettings.findUnique({ where: { pageId: page.id } }),
      db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { rates: { orderBy: { sort: "asc" } } } }),
      db.rateBundle.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { platforms: true, rates: { orderBy: { sort: "asc" } } } }),
      pro(page.userId),
    ]);
    return {
      ...langsOf(page),
      locked: !isPro && !FREE_LIMITS.rates,
      settings: settings
        ? { showOnPage: settings.showOnPage, showInPdf: settings.showInPdf, currency: settings.currency, vatIncluded: settings.vatIncluded }
        : { showOnPage: true, showInPdf: true, currency: page.primaryLang === "en" ? "USD" : "SAR", vatIncluded: true },
      accounts: accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, rates: a.rates.map(rate) })),
      bundle: bundles[0] ? { name: bundles[0].name ?? "", nameEn: bundles[0].nameEn ?? "", accountIds: bundles[0].platforms.map((p) => p.accountId), rates: bundles[0].rates.map(rate) } : null,
    };
  },
  async links(page: Page) {
    const [links, services, settings, isPro] = await Promise.all([
      db.pageLink.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
      db.service.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
      db.rateSettings.findUnique({ where: { pageId: page.id }, select: { currency: true } }),
      pro(page.userId),
    ]);
    return {
      ...langsOf(page),
      currency: settings?.currency ?? (page.primaryLang === "en" ? "USD" : "SAR"),
      freeLimits: isPro ? null : { links: FREE_LIMITS.links, services: FREE_LIMITS.services },
      links: links.map((l) => ({ title: l.title, titleEn: l.titleEn ?? "", url: l.url, imageUrl: l.imageUrl })),
      services: services.map((s) => ({ name: s.name, nameEn: s.nameEn ?? "", description: s.description, descriptionEn: s.descriptionEn ?? "", price: s.price === null ? "" : String(Number(s.price)), unit: s.unit, unitEn: s.unitEn ?? "" })),
    };
  },
  async contact(page: Page) {
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const clicks = await db.contactClick.groupBy({ by: ["kind"], where: { pageId: page.id, day: { gte: since }, kind: { in: ["whatsapp", "email"] } }, _count: true });
    const taps = (k: string) => clicks.find((c) => c.kind === k)?._count ?? 0;
    return { whatsapp: page.whatsapp ?? "", email: page.contactEmail ?? "", whatsappVisible: page.whatsappVisible, emailVisible: page.emailVisible, taps: { whatsapp: taps("whatsapp"), email: taps("email") } };
  },
  async verification(page: Page) {
    const [accounts, isPro, licenses] = await Promise.all([
      db.socialAccount.findMany({
        where: { pageId: page.id }, orderBy: { sort: "asc" },
        include: { verificationRequests: { where: { status: { in: ["pending", "approved", "rejected"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      pro(page.userId),
      db.license.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    ]);
    return {
      isPro,
      accounts: toVerifyAccounts(accounts),
      licenses: licenses.map((l) => ({
        id: l.id, name: l.name, number: l.number, hasFile: !!l.fileUrl, rejectReason: l.rejectReason,
        status: l.verificationStatus === "verified" || l.verificationStatus === "in_review" || l.verificationStatus === "rejected" ? l.verificationStatus : "none",
      })),
    };
  },
  async analytics(page: Page, params: URLSearchParams) {
    const isPro = await pro(page.userId);
    if (!isPro && !FREE_LIMITS.analytics) return { locked: true as const };
    const raw = Number(params.get("range"));
    const range: Range = (RANGES as readonly number[]).includes(raw) ? (raw as Range) : 30;
    const end = today();
    const [report, prev] = await Promise.all([
      analyticsReport(page.id, range),
      periodTotals(page.id, new Date(end.getTime() - (2 * range - 1) * 86_400_000), new Date(end.getTime() - range * 86_400_000)),
    ]);
    return { locked: false as const, range, ranges: RANGES, report, prev };
  },
  async referrals(page: Page) {
    const userId = page.userId;
    const since = new Date(today().getTime() - 29 * 86_400_000);
    const [isPro, balance, clicksAll, clicksDays, customers, commissions, payouts, account, signups] = await Promise.all([
      pro(userId),
      referralBalance(userId),
      db.referralClick.count({ where: { referrerId: userId } }),
      db.referralClick.groupBy({ by: ["day"], where: { referrerId: userId, day: { gte: since } }, _count: { _all: true } }),
      db.user.findMany({ where: { referredById: userId }, orderBy: { referredAt: "desc" }, take: 200, select: { id: true, referredAt: true, createdAt: true, subscription: { select: { status: true, trialEndsAt: true } } } }),
      db.referralCommission.groupBy({ by: ["referredUserId"], where: { referrerId: userId, cancelledAt: null }, _sum: { amount: true } }),
      db.referralPayout.findMany({ where: { referrerId: userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.referralAccount.findUnique({ where: { userId } }),
      db.user.count({ where: { referredById: userId } }),
    ]);
    const earned = new Map(commissions.map((c) => [c.referredUserId, Number(c._sum.amount ?? 0)]));
    const perDay = new Map(clicksDays.map((d) => [d.day.toISOString().slice(0, 10), d._count._all]));
    return {
      isPro, rule: REFERRAL, link: referralLink(page.username), balance, clicksAll, signups,
      paying: commissions.filter((c) => c.referredUserId && Number(c._sum.amount ?? 0) > 0).length,
      series: Array.from({ length: 30 }, (_, i) => {
        const day = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
        return { day, clicks: perDay.get(day) ?? 0 };
      }),
      customers: customers.map((c) => ({ joined: (c.referredAt ?? c.createdAt).toISOString(), plan: planLabel(c.subscription), commission: earned.get(c.id) ?? 0 })),
      payouts: payouts.map((p) => ({ method: p.method, amount: Number(p.amount), note: p.note, createdAt: p.createdAt.toISOString() })),
      payout: { method: account?.payoutMethod ?? "credit", maskedIban: maskIban(account?.iban ?? null), holderName: account?.holderName ?? "" },
    };
  },
  async subscription(page: Page) {
    const [sub, invoices] = await Promise.all([
      db.subscription.findUnique({ where: { userId: page.userId } }),
      db.invoice.findMany({ where: { userId: page.userId, status: { in: ["paid", "refunded"] } }, orderBy: { createdAt: "desc" }, take: 24 }),
    ]);
    return {
      plan: planLabel(sub), status: sub?.status ?? "expired", cycle: sub?.cycle ?? null, currency: sub?.currency ?? null,
      trialDaysLeft: sub?.status === "trialing" ? trialDaysLeft(sub.trialEndsAt) : 0,
      periodEnd: sub?.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      paymentMethod: sub?.paymentMethodLabel ?? null,
      invoices: invoices.map((i) => ({ id: i.id, label: invoiceLabel(i.number), status: i.status, amount: Number(i.amount), currency: i.currency, paidAt: i.paidAt?.toISOString() ?? null })),
      username: page.username,
      deletedAt: page.deletedAt?.toISOString() ?? null,
      purgeAt: page.deletedAt ? new Date(page.deletedAt.getTime() + DELETE_AFTER_DAYS * 86_400_000).toISOString() : null,
    };
  },
  async appearance(page: Page) {
    const isPro = await pro(page.userId);
    return {
      isPro,
      freeTemplates: FREE_LIMITS.templates,
      template: page.template,
      customColors: parseCustomColors(page.customColors) ?? { colors: ["#0060e6"], mode: "light" },
      accent: ACCENT_SWATCHES.some((sw) => sw.light === page.accent) ? page.accent : null,
      accents: ACCENT_SWATCHES,
      hideBranding: page.hideBranding,
      iconStyle: page.iconStyle,
    };
  },
} as const;

export type SectionKey = keyof typeof LOADERS;
export const isSection = (k: string): k is SectionKey => Object.hasOwn(LOADERS, k);
export const loadSection = (key: SectionKey, page: Page, params: URLSearchParams) => LOADERS[key](page, params);
