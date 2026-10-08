/**
 * Creates (or recreates) the demo creator page at /demo with sample data.
 * Local development:  DATABASE_URL=<local db> npx tsx scripts/seed-demo.ts
 * "demo" is a reserved username, so no creator can claim it.
 *
 * Optional args for local template previews (never use in production):
 *   npx tsx scripts/seed-demo.ts <username> <template> [custom colors, e.g. "#e63946,#1d3557:dark"] [free]
 */
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const [argUsername = "demo", argTemplate = "white", argCustom, argPlan] = process.argv.slice(2);
// Stable id per username so re-running replaces the same demo user.
const hash = createHash("sha256").update(argUsername).digest("hex");
const USER_ID = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
const TEMPLATE = argTemplate as "white" | "black" | "sand" | "pink" | "black_gold" | "vivid" | "green" | "custom";
const CUSTOM = argCustom
  ? { colors: argCustom.split(":")[0].split(","), mode: argCustom.split(":")[1] === "dark" ? "dark" : "light" }
  : undefined;
const PLAN = argPlan === "free" ? ({ plan: "free", status: "expired" } as const) : ({ plan: "pro", status: "active" } as const);

async function main() {
  await db.user.deleteMany({ where: { id: USER_ID } });
  await db.user.create({
    data: {
      id: USER_ID,
      email: `${argUsername}@demo.wsool.link`,
      subscription: { create: PLAN },
      page: {
        create: {
          username: argUsername,
          primaryLang: "ar",
          enEnabled: true,
          template: TEMPLATE,
          customColors: CUSTOM,
          isPublished: true,
          photoUrl: "/demo/avatar.svg",
          whatsapp: "966500000000",
          contactEmail: "hello@example.com",
          translations: {
            create: [
              { lang: "ar", fullName: "سارة المطيري", specialty: "صانعة محتوى أزياء وجمال", bio: "أشارك يومياتي مع الموضة والعناية، وأتعاون مع البراندات بمحتوى صادق وقريب من الناس.", city: "الرياض", country: "السعودية" },
              { lang: "en", fullName: "Sara Almutairi", specialty: "Fashion & beauty creator", bio: "I share my daily life with fashion and self-care, and partner with brands on honest, relatable content.", city: "Riyadh", country: "Saudi Arabia" },
            ],
          },
          tags: {
            create: [
              ...["موضة", "جمال", "عناية", "سفر", "مطاعم", "لايف ستايل"].map((label, sort) => ({ lang: "ar" as const, label, sort })),
              ...["Fashion", "Beauty", "Skincare", "Travel", "Food", "Lifestyle"].map((label, sort) => ({ lang: "en" as const, label, sort })),
            ],
          },
          licenses: { create: [{ name: "رخصة موثوق", nameEn: "Mawthooq license", number: "MW-123456", fileUrl: "/demo/license-sample.svg", sort: 0 }] },
          monthlyViews: { create: [{ month: new Date("2026-09-01"), views: BigInt(4_800_000) }] },
          brandLogos: {
            create: ["Almarai", "STC", "Jarir", "Noon", "Careem"].map((name, sort) => ({ name, logoUrl: `/demo/logo-${name.toLowerCase()}.svg`, sort })),
          },
          portfolioItems: {
            create: [1, 2, 3, 4].map((i, sort) => ({
              platform: (["tiktok", "instagram", "snapchat", "tiktok"] as const)[sort],
              videoUrl: "/demo/sample-work.mp4",
              thumbUrl: `/demo/work-${i}.svg`,
              sort,
              translations: {
                create: [
                  { lang: "ar" as const, brand: ["المراعي", "STC", "جرير", "نون"][sort], type: ["إعلان منتج", "تجربة خدمة", "مراجعة", "عرض خاص"][sort] },
                  { lang: "en" as const, brand: ["Almarai", "STC", "Jarir", "Noon"][sort], type: ["Product ad", "Service review", "Review", "Special offer"][sort] },
                ],
              },
            })),
          },
          rateSettings: { create: { showOnPage: true, showInPdf: true, currency: "SAR", vatIncluded: true } },
        },
      },
    },
  });

  const page = await db.page.findUniqueOrThrow({ where: { username: argUsername } });
  const in60 = new Date(Date.now() + 60 * 86_400_000);
  const accounts = [
    { platform: "tiktok", handle: "sara.style", followers: 1_240_000, verified: true, rates: [["ستوري", "Story", 3500], ["فيديو", "Video", 9000]] },
    { platform: "instagram", handle: "sara.style", followers: 856_000, verified: true, rates: [["ستوري", "Story", 3000], ["فيديو", "Video", 8000]] },
    { platform: "snapchat", handle: "sarastyle", followers: 410_000, verified: false, rates: [["ستوري", "Story", 2500]] },
    { platform: "youtube", handle: "SaraStyle", followers: 128_500, verified: false, rates: [["فيديو", "Video", 12000]] },
  ] as const;
  const ids: string[] = [];
  for (const [sort, a] of accounts.entries()) {
    const created = await db.socialAccount.create({
      data: {
        pageId: page.id, platform: a.platform, handle: a.handle, sort,
        url: `https://example.com/${a.platform}/${a.handle}`,
        followers: a.followers, followersUpdatedAt: new Date(),
        verificationStatus: a.verified ? "verified" : "none", verifiedUntil: a.verified ? in60 : null,
        rates: { create: a.rates.map(([name, nameEn, price], i) => ({ name, nameEn, price, sort: i })) },
        audience: a.platform === "tiktok" ? {
          create: {
            gender: [{ label: "female", percent: 68 }, { label: "male", percent: 32 }],
            ages: [{ label: "18-24", percent: 41 }, { label: "25-34", percent: 37 }, { label: "35-44", percent: 15 }, { label: "45+", percent: 7 }],
            countries: [{ label: "SA", percent: 72 }, { label: "AE", percent: 9 }, { label: "KW", percent: 6 }],
            cities: [{ label: "Riyadh", percent: 38 }, { label: "Jeddah", percent: 21 }, { label: "Dammam", percent: 9 }],
          },
        } : undefined,
      },
    });
    ids.push(created.id);
  }
  await db.rateBundle.create({
    data: {
      pageId: page.id, name: "باقة الانتشار", nameEn: "Reach bundle",
      platforms: { create: [{ accountId: ids[0] }, { accountId: ids[1] }] },
      rates: { create: [{ name: "ستوري", nameEn: "Story", price: 5500, sort: 0 }] },
    },
  });
  console.log(`Demo page ready at /${argUsername} (${TEMPLATE}, ${PLAN.plan})`);
}

main().finally(() => db.$disconnect());
