import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { LinksEditor } from "./LinksEditor";

async function Editor() {
  const { page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [links, services, settings, sub] = await Promise.all([
    db.pageLink.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    db.service.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    db.rateSettings.findUnique({ where: { pageId: page.id }, select: { currency: true } }),
    db.subscription.findUnique({ where: { userId: page.userId }, select: { status: true, trialEndsAt: true } }),
  ]);
  return (
    <LinksEditor
      initialLinks={links.map((l) => ({ title: l.title, titleEn: l.titleEn ?? "", url: l.url, imageUrl: l.imageUrl }))}
      initialServices={services.map((s) => ({
        name: s.name, nameEn: s.nameEn ?? "", description: s.description, descriptionEn: s.descriptionEn ?? "",
        price: s.price === null ? "" : String(Number(s.price)), unit: s.unit, unitEn: s.unitEn ?? "",
      }))}
      currency={settings?.currency ?? (page.primaryLang === "en" ? "USD" : "SAR")}
      lang={{ primary: page.primaryLang as "ar" | "en", showEnglish: page.primaryLang === "ar" && page.enEnabled }}
      freeLimits={hasPro(sub) ? null : { links: FREE_LIMITS.links, services: FREE_LIMITS.services }}
    />
  );
}

export default async function LinksPage({ params }: PageProps<"/[locale]/dashboard/links">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("links")} section="links" />
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
