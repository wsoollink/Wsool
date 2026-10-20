import { createHash } from "node:crypto";
import type { Platform, Template } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";
import { DEMO_EMAIL } from "@/config/site";

/**
 * The demo creator page at wsool.link/demo: a fictional creator ("Abdullah") that shows
 * EVERY feature of a Wsool page, linked from the home page. When a new page feature is
 * added, add a sample of it here too (CLAUDE.md "Demo page").
 *
 * Built by the owner's "Refresh demo page" button (admin overview) on the live site, and by
 * scripts/seed-demo.ts locally. Images live in public/demo/ (PNG/JPEG: the PDF can't embed SVG).
 * Links point to example.com and platform home pages, never to real people's accounts.
 */
export const DEMO_USERNAME = "demo";

/** Stable user id per username, so a refresh replaces the same demo account. */
export function demoUserId(username: string) {
  const h = createHash("sha256").update(username).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const FAR = new Date("2099-12-31T00:00:00Z"); // verified / paid "forever": no reminder ever fires

// Every platform, biggest first (followers), with each one's home page as its link.
const ACCOUNTS: { platform: Platform; handle: string; followers: number; home: string }[] = [
  { platform: "tiktok", handle: "abdullah.wsool", followers: 1_480_000, home: "https://www.tiktok.com/" },
  { platform: "instagram", handle: "abdullah.wsool", followers: 920_000, home: "https://www.instagram.com/" },
  { platform: "snapchat", handle: "abdullah.wsool", followers: 640_000, home: "https://www.snapchat.com/" },
  { platform: "youtube", handle: "AbdullahWsool", followers: 310_000, home: "https://www.youtube.com/" },
  { platform: "x", handle: "abdullah_wsool", followers: 185_000, home: "https://x.com/" },
  { platform: "threads", handle: "abdullah.wsool", followers: 96_000, home: "https://www.threads.com/" },
  { platform: "facebook", handle: "abdullah.wsool", followers: 74_000, home: "https://www.facebook.com/" },
  { platform: "twitch", handle: "abdullah_wsool", followers: 41_000, home: "https://www.twitch.tv/" },
  { platform: "telegram", handle: "abdullah_wsool", followers: 38_000, home: "https://telegram.org/" },
  { platform: "linkedin", handle: "abdullah-wsool", followers: 22_000, home: "https://www.linkedin.com/" },
  { platform: "pinterest", handle: "abdullahwsool", followers: 15_000, home: "https://www.pinterest.com/" },
  { platform: "spotify", handle: "Abdullah Podcast", followers: 12_500, home: "https://open.spotify.com/" },
  { platform: "discord", handle: "Abdullah Community", followers: 9_800, home: "https://discord.com/" },
  { platform: "jaco", handle: "abdullah", followers: 8_200, home: "https://jaco.live/" },
];

// Audience for the big platforms (gender, the fixed age groups, top countries and cities).
const AUDIENCE: Partial<Record<Platform, { male: number; ages: number[]; countries: [string, number][]; cities: [string, number][] }>> = {
  tiktok: { male: 58, ages: [8, 44, 33, 11, 4], countries: [["SA", 71], ["KW", 8], ["AE", 7], ["EG", 4], ["QA", 3]], cities: [["الرياض", 34], ["جدة", 19], ["الدمام", 10], ["مكة", 7], ["المدينة", 5]] },
  instagram: { male: 52, ages: [4, 38, 39, 14, 5], countries: [["SA", 68], ["AE", 9], ["KW", 8], ["BH", 4], ["QA", 3]], cities: [["الرياض", 37], ["جدة", 18], ["الخبر", 9], ["أبها", 5], ["الطائف", 4]] },
  snapchat: { male: 49, ages: [12, 47, 29, 9, 3], countries: [["SA", 83], ["KW", 6], ["AE", 4], ["BH", 2], ["OM", 2]], cities: [["الرياض", 39], ["جدة", 17], ["القصيم", 8], ["الدمام", 8], ["حائل", 4]] },
  youtube: { male: 66, ages: [6, 35, 36, 16, 7], countries: [["SA", 55], ["EG", 12], ["AE", 7], ["JO", 5], ["KW", 5]], cities: [["الرياض", 28], ["جدة", 15], ["القاهرة", 9], ["دبي", 5], ["عمّان", 4]] },
  x: { male: 63, ages: [3, 31, 40, 18, 8], countries: [["SA", 77], ["KW", 7], ["AE", 5], ["QA", 3], ["BH", 2]], cities: [["الرياض", 41], ["جدة", 16], ["الدمام", 9], ["مكة", 6], ["تبوك", 3]] },
};
const AGES = ["13-17", "18-24", "25-34", "35-44", "45+"];

// Ad rates per platform: the same names everywhere, so the bundle can show "instead of X, save Y%".
const RATES: Partial<Record<Platform, [string, string, number][]>> = {
  tiktok: [["فيديو", "Video", 9500], ["ستوري", "Story", 3500], ["بث مباشر", "Live", 12000]],
  instagram: [["فيديو", "Video", 8000], ["ستوري", "Story", 3000], ["منشور", "Post", 5000]],
  snapchat: [["فيديو", "Video", 6000], ["ستوري", "Story", 2500]],
  youtube: [["فيديو", "Video", 15000], ["ذكر في فيديو", "Mention", 6000]],
  x: [["تغريدة", "Post", 2500], ["سلسلة", "Thread", 4000]],
};

const BRANDS = [
  ["najd-coffee", "قهوة نجد", "Najd Coffee"],
  ["safarat", "سفرات", "Safarat"],
  ["jawal-plus", "جوال بلس", "Jawal Plus"],
  ["reem-perfumes", "عطور ريم", "Reem Perfumes"],
  ["active-sport", "أكتف سبورت", "Active Sport"],
  ["alwaha-dates", "تمور الواحة", "Alwaha Dates"],
] as const;

// Past work: one per brand above (cover in public/demo/work-N.jpg, the same sample video).
const WORKS: { platform: Platform; brand: number; type: [string, string] }[] = [
  { platform: "tiktok", brand: 0, type: ["تجربة منتج", "Product review"] },
  { platform: "snapchat", brand: 1, type: ["تغطية رحلة", "Trip coverage"] },
  { platform: "youtube", brand: 2, type: ["فتح صندوق", "Unboxing"] },
  { platform: "instagram", brand: 3, type: ["إعلان", "Ad"] },
  { platform: "tiktok", brand: 4, type: ["تحدّي", "Challenge"] },
  { platform: "instagram", brand: 5, type: ["حملة رمضان", "Ramadan campaign"] },
];

export type DemoOptions = { username?: string; template?: Template; customColors?: { colors: string[]; mode: "light" | "dark" }; free?: boolean };

/** Deletes and recreates the demo page (with sample data for every feature) and its Pro plan. */
export async function buildDemoPage(db: PrismaClient, opts: DemoOptions = {}) {
  const username = opts.username ?? DEMO_USERNAME;
  const categories = await db.category.findMany({ orderBy: { sort: "asc" }, select: { id: true, nameEn: true } });
  const picked = [
    ...categories.filter((c) => /lifestyle|tech/i.test(c.nameEn)),
    ...categories,
  ].filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i).slice(0, 2);
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1));

  // The page belongs to the owner's own account (DEMO_EMAIL) so they can edit it from the dashboard or the
  // app; before that account exists, to a placeholder account (removed once the owner's is used).
  const owner = username === DEMO_USERNAME ? await db.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } }) : null;
  const placeholderId = demoUserId(username);
  const userId = owner?.id ?? placeholderId;
  const plan = opts.free
    ? ({ plan: "free", status: "expired" } as const)
    : ({ plan: "pro", status: "active", cycle: "yearly", currency: "SAR", currentPeriodEnd: FAR } as const);

  await db.$transaction(async (tx) => {
    await tx.user.deleteMany({ where: { id: placeholderId } });
    if (owner) {
      await tx.page.deleteMany({ where: { userId } });
      await tx.subscription.upsert({
        where: { userId },
        create: { userId, ...plan },
        update: { ...plan, trialEndsAt: null, cancelAtPeriodEnd: false, failedAttempts: 0, nextRetryAt: null },
      });
    } else {
      await tx.user.create({
        data: {
          id: placeholderId,
          email: `${username}@demo.wsool.link`,
          subscription: { create: plan },
          notificationSettings: { create: { emailReminders: false, emailProductNews: false } },
        },
      });
    }
    await tx.page.create({
      data: {
        userId,
        username,
        primaryLang: "ar",
        enEnabled: true,
        template: opts.template ?? "white",
        customColors: opts.customColors,
        photoShape: "full",
        iconStyle: "color",
        isPublished: true,
        photoUrl: "/demo/abdullah.jpg",
        logoUrl: "/demo/creator-logo.png",
        // Demo contact details: a reserved example domain and an unassigned-looking number.
        whatsapp: "966500000000",
        contactEmail: "abdullah@example.com",
        translations: {
          create: [
            { lang: "ar", fullName: "عبدالله القحطاني", specialty: "صانع محتوى لايف ستايل وتقنية", bio: "أشارك يومياتي في الرياض، تجارب المنتجات والتقنية والسفر، وأتعاون مع البراندات بمحتوى صادق يوصل للناس. هذي صفحة تجريبية من وصول تعرض كل اللي تقدر تضيفه في صفحتك.", city: "الرياض", country: "السعودية" },
            { lang: "en", fullName: "Abdullah Alqahtani", specialty: "Lifestyle & tech creator", bio: "I share my days in Riyadh, product and tech reviews and travel, and partner with brands on honest content people trust. This is a Wsool demo page showing everything you can add to yours.", city: "Riyadh", country: "Saudi Arabia" },
          ],
        },
        tags: {
          create: [
            ...["لايف ستايل", "تقنية", "سفر", "قهوة", "رياضة", "مطاعم"].map((label, sort) => ({ lang: "ar" as const, label, sort })),
            ...["Lifestyle", "Tech", "Travel", "Coffee", "Fitness", "Food"].map((label, sort) => ({ lang: "en" as const, label, sort })),
          ],
        },
        licenses: {
          create: [{ name: "رخصة موثوق", nameEn: "Mawthooq license", number: "MW-000000", fileUrl: "/demo/license.png", sort: 0, verificationStatus: "verified", submittedAt: new Date(), reviewedAt: new Date() }],
        },
        brandLogos: { create: BRANDS.map(([file, name], sort) => ({ name, logoUrl: `/demo/brand-${file}.png`, sort })) },
        portfolioItems: {
          create: WORKS.map((w, sort) => ({
            platform: w.platform,
            videoUrl: "/demo/sample-work.mp4",
            thumbUrl: `/demo/work-${sort + 1}.jpg`,
            sort,
            translations: { create: [{ lang: "ar" as const, brand: BRANDS[w.brand][1], type: w.type[0] }, { lang: "en" as const, brand: BRANDS[w.brand][2], type: w.type[1] }] },
          })),
        },
        rateSettings: { create: { showOnPage: true, showInPdf: true, currency: "SAR", vatIncluded: true } },
        services: {
          create: [
            { name: "تصوير منتجات", nameEn: "Product photography", description: "جلسة تصوير لمنتجك مع 10 صور معدّلة جاهزة للنشر.", descriptionEn: "A shoot for your product with 10 edited photos ready to post.", price: 1800, unit: "للجلسة", unitEn: "per session", sort: 0 },
            { name: "تقديم فعاليات", nameEn: "Event hosting", description: "تقديم افتتاحيات وفعاليات الشركات بالعربي والإنجليزي.", descriptionEn: "Hosting openings and company events in Arabic and English.", price: null, unit: "", sort: 1 },
            { name: "استشارة محتوى", nameEn: "Content consulting", description: "جلسة ساعة لخطة محتوى حسابات شركتك.", descriptionEn: "A one-hour session on a content plan for your brand's accounts.", price: 750, unit: "للساعة", unitEn: "per hour", sort: 2 },
          ],
        },
        links: {
          create: [
            { title: "متجري", titleEn: "My store", url: "https://store.example.com", sort: 0 },
            { title: "دورة التصوير بالجوال", titleEn: "Phone photography course", url: "https://course.example.com", sort: 1 },
            { title: "البودكاست", titleEn: "Podcast", url: "https://podcast.example.com", sort: 2 },
          ],
        },
        coupons: {
          create: [
            { store: "عطور ريم", storeEn: "Reem Perfumes", description: "خصم 15% على كل العطور", descriptionEn: "15% off all perfumes", code: "ABDULLAH15", url: "https://reem.example.com", logoUrl: "/demo/store-reem-perfumes.png", sort: 0 },
            { store: "قهوة نجد", storeEn: "Najd Coffee", description: "خصم 10% على أول طلب", descriptionEn: "10% off your first order", code: "ABD10", url: "https://najd.example.com", logoUrl: "/demo/store-najd-coffee.png", sort: 1 },
            { store: "سفرات", storeEn: "Safarat", description: "خصم 200 ريال على الباقات", descriptionEn: "SAR 200 off holiday packages", code: "SAFAR200", url: "https://safarat.example.com", logoUrl: "/demo/store-safarat.png", sort: 2 },
          ],
        },
        categories: { create: picked.map((c) => ({ categoryId: c.id })) },
      },
    });

    const page = await tx.page.findUniqueOrThrow({ where: { userId }, select: { id: true } });
    const ids: Partial<Record<Platform, string>> = {};
    for (const [sort, a] of ACCOUNTS.entries()) {
      const aud = AUDIENCE[a.platform];
      const created = await tx.socialAccount.create({
        data: {
          pageId: page.id, platform: a.platform, handle: a.handle, url: a.home, sort,
          followers: a.followers, followersUpdatedAt: new Date(),
          // The big five are verified (badge on the page); the rest show as not verified yet.
          verificationStatus: sort < 5 ? "verified" : "none", verifiedUntil: sort < 5 ? FAR : null,
          rates: { create: (RATES[a.platform] ?? []).map(([name, nameEn, price], i) => ({ name, nameEn, price, sort: i })) },
          audience: aud ? {
            create: {
              gender: [{ label: "male", percent: aud.male }, { label: "female", percent: 100 - aud.male }],
              ages: aud.ages.map((percent, i) => ({ label: AGES[i], percent })),
              countries: aud.countries.map(([label, percent]) => ({ label, percent })),
              cities: aud.cities.map(([label, percent]) => ({ label, percent })),
            },
          } : undefined,
        },
        select: { id: true },
      });
      ids[a.platform] = created.id;
    }

    const views: Partial<Record<Platform, number>> = { tiktok: 6_200_000, instagram: 3_100_000, snapchat: 2_400_000, youtube: 1_350_000, x: 620_000 };
    await tx.monthlyView.create({
      data: {
        pageId: page.id, month,
        views: BigInt(Object.values(views).reduce((s, v) => s + (v ?? 0), 0)),
        byAccount: Object.fromEntries(Object.entries(views).map(([p, v]) => [ids[p as Platform]!, v])),
      },
    });

    // Bundle: TikTok + Instagram + Snapchat video (separately 23,500) for 19,000.
    await tx.rateBundle.create({
      data: {
        pageId: page.id, name: "باقة الانتشار", nameEn: "Reach bundle",
        platforms: { create: (["tiktok", "instagram", "snapchat"] as const).map((p) => ({ accountId: ids[p]! })) },
        rates: { create: [{ name: "فيديو", nameEn: "Video", price: 19000, sort: 0 }, { name: "ستوري", nameEn: "Story", price: 7500, sort: 1 }] },
      },
    });
  }, { timeout: 30_000 });

  return username;
}
