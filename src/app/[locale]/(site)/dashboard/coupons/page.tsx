import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { CouponsEditor } from "./CouponsEditor";
import { SectionSkeleton } from "@/components/dashboard/SectionSkeleton";

async function Editor() {
  const { page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [coupons, sub] = await Promise.all([
    db.coupon.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    db.subscription.findUnique({ where: { userId: page.userId }, select: { status: true, trialEndsAt: true } }),
  ]);
  return (
    <CouponsEditor
      initial={coupons.map((c) => ({
        store: c.store, storeEn: c.storeEn ?? "", description: c.description, descriptionEn: c.descriptionEn ?? "",
        code: c.code, url: c.url, logoUrl: c.logoUrl, expiresOn: c.expiresOn ? c.expiresOn.toISOString().slice(0, 10) : "",
      }))}
      lang={{ primary: page.primaryLang as "ar" | "en", showEnglish: page.primaryLang === "ar" && page.enEnabled }}
      freeLimit={hasPro(sub) ? null : FREE_LIMITS.coupons}
    />
  );
}

export default async function CouponsPage({ params }: PageProps<"/[locale]/dashboard/coupons">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("coupons")} section="coupons" />
      <Suspense fallback={<SectionSkeleton />}>
        <Editor />
      </Suspense>
    </div>
  );
}
