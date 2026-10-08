import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageLanguages } from "@/lib/page-language";
import { BrandsCard } from "./BrandsCard";
import { WorksCard } from "./WorksCard";

async function Editor() {
  const { user, page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [brands, works, sub] = await Promise.all([
    db.brandLogo.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    db.portfolioItem.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { translations: true } }),
    db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } }),
  ]);
  const text = (w: (typeof works)[number], lang: Locale) => {
    const tr = w.translations.find((x) => x.lang === lang);
    return { brand: tr?.brand ?? "", type: tr?.type ?? "" };
  };

  return (
    <div className="flex flex-col gap-4">
      <BrandsCard initial={brands.map((b) => ({ name: b.name, url: b.logoUrl }))} />
      <WorksCard
        langs={pageLanguages(page.primaryLang as Locale, page.enEnabled)}
        freeLimit={hasPro(sub) ? null : FREE_LIMITS.portfolioItems}
        initial={works.map((w) => ({ platform: w.platform, videoUrl: w.videoUrl, thumbUrl: w.thumbUrl, ar: text(w, "ar"), en: text(w, "en") }))}
      />
    </div>
  );
}

export default async function WorkPage({ params }: PageProps<"/[locale]/dashboard/work">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("work")}</h1>
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
