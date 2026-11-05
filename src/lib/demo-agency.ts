import type { Platform } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import type { AgencyCreator, PublicAgency } from "@/lib/agency-page";

/**
 * The demo agency page at /agencies/demo (owner, Nov 2026): a fictional agency with fictional creators, linked from
 * the agencies landing page. Nothing is stored; every card opens the demo creator page (/demo). Photos in
 * public/demo/agency/ are AI-generated portraits (the 6th is the demo creator's own photo); contact links go to example.com.
 */
type Row = { ar: string; en: string; specAr: string; specEn: string; catAr: string; catEn: string; photo: string; followers: number | null; verified: boolean; platforms: Platform[] };

const ROWS: Row[] = [
  { ar: "عبدالله بن سلطان", en: "Abdullah bin Sultan", specAr: "صانع محتوى سفر وتجارب", specEn: "Travel & lifestyle creator", catAr: "سفر", catEn: "Travel", photo: "/demo/abdullah.jpg", followers: 2_480_000, verified: true, platforms: ["snapchat", "instagram", "tiktok", "youtube", "x"] },
  { ar: "نورة الفيصل", en: "Noura Al Faisal", specAr: "صانعة محتوى جمال وأسلوب حياة", specEn: "Beauty & lifestyle creator", catAr: "جمال", catEn: "Beauty", photo: "/demo/agency/creator-1.jpg", followers: 1_920_000, verified: true, platforms: ["instagram", "tiktok", "snapchat"] },
  { ar: "فيصل العمر", en: "Faisal Al Omar", specAr: "مراجعات تقنية وألعاب", specEn: "Tech & gaming reviews", catAr: "تقنية", catEn: "Tech", photo: "/demo/agency/creator-2.jpg", followers: 1_350_000, verified: true, platforms: ["youtube", "x", "tiktok", "twitch"] },
  { ar: "سارة المهيري", en: "Sara Al Muhairi", specAr: "رحلات ومدن الخليج", specEn: "Gulf travel & cities", catAr: "سفر", catEn: "Travel", photo: "/demo/agency/creator-3.jpg", followers: 860_000, verified: true, platforms: ["instagram", "tiktok", "youtube"] },
  { ar: "خالد الرميح", en: "Khalid Al Rumaih", specAr: "لياقة وتغذية", specEn: "Fitness & nutrition", catAr: "رياضة", catEn: "Sports", photo: "/demo/agency/creator-4.jpg", followers: 640_000, verified: false, platforms: ["instagram", "tiktok", "snapchat"] },
  { ar: "ريم الحربي", en: "Reem Al Harbi", specAr: "مطاعم ومقاهي الرياض", specEn: "Riyadh food & cafés", catAr: "طبخ ومطاعم", catEn: "Food", photo: "/demo/agency/creator-5.jpg", followers: null, verified: true, platforms: ["snapchat", "tiktok", "instagram"] },
];

export const DEMO_AGENCY_PATH = "/agencies/demo";

export function buildDemoAgency(lang: Locale): PublicAgency {
  const en = lang === "en";
  const creators: AgencyCreator[] = ROWS.map((r, i) => {
    const name = en ? r.en : r.ar;
    return {
      pageId: `demo-${i}`,
      username: "demo",
      photoUrl: r.photo,
      name,
      specialty: en ? r.specEn : r.specAr,
      city: en ? "Riyadh" : "الرياض",
      cityKey: null,
      country: en ? "Saudi Arabia" : "السعودية",
      countryCode: "SA",
      categories: [],
      categoryNames: [en ? r.catEn : r.catAr],
      langs: ["ar", "en"],
      platforms: r.platforms,
      followers: r.followers,
      size: null,
      verified: r.verified,
      locked: false,
    };
  });
  return {
    id: "demo",
    slug: "agencies/demo",
    name: en ? "Nojoom Agency" : "وكالة نجوم",
    tagline: en ? "We connect brands with the creators their audience trusts" : "نوصل علامتك التجارية بالمؤثرين اللي يثق فيهم جمهورك",
    bio: en
      ? "Nojoom is a Riyadh-based influencer marketing agency managing creators across travel, beauty, tech, food and fitness.\nWe plan the campaign, pick the right creators, and report verified results."
      : "وكالة نجوم وكالة تسويق مؤثرين في الرياض، تدير مؤثرين في السفر والجمال والتقنية والمطاعم واللياقة.\nنخطط الحملة، ونختار المؤثرين المناسبين، ونقدّم نتائج موثّقة.",
    city: en ? "Riyadh" : "الرياض",
    logoUrl: null,
    whatsapp: null,
    email: "hello@example.com",
    website: "https://example.com",
    template: "executive",
    accent: null,
    hasEnglish: true,
    // Fictional handles; links go to the platforms' home pages (never real accounts).
    accounts: [
      { platform: "instagram", handle: "nojoom.agency", url: "https://www.instagram.com/", followers: 48_200 },
      { platform: "x", handle: "nojoomagency", url: "https://x.com/", followers: 21_500 },
      { platform: "linkedin", handle: "nojoom-agency", url: "https://www.linkedin.com/", followers: 9_800 },
      { platform: "tiktok", handle: "nojoom.agency", url: "https://www.tiktok.com/", followers: 35_600 },
    ],
    brands: ["najd-coffee", "reem-perfumes", "safarat", "jawal-plus", "alwaha-dates", "active-sport"].map((b) => ({ logoUrl: `/demo/logo-${b}.png`, name: null })),
    creators,
    stats: {
      creators: creators.length,
      followers: creators.reduce((s, c) => s + (c.followers ?? 0), 0),
      verified: creators.filter((c) => c.verified).length,
      platforms: [...new Set(creators.flatMap((c) => c.platforms))],
    },
  };
}
