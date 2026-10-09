import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { RatesEditor } from "./RatesEditor";
import { PageHeader } from "@/components/dashboard/PageHeader";

async function Editor() {
  const { page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [settings, accounts, bundles] = await Promise.all([
    db.rateSettings.findUnique({ where: { pageId: page.id } }),
    db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { rates: { orderBy: { sort: "asc" } } } }),
    db.rateBundle.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { platforms: true, rates: { orderBy: { sort: "asc" } } } }),
  ]);
  const rate = (r: { name: string; nameEn: string | null; price: unknown }) => ({ name: r.name, nameEn: r.nameEn, price: Number(r.price) });

  return (
    <RatesEditor
      // Same defaults as the public page when nothing is saved yet.
      settings={
        settings
          ? { showOnPage: settings.showOnPage, showInPdf: settings.showInPdf, currency: settings.currency, vatIncluded: settings.vatIncluded }
          : { showOnPage: true, showInPdf: true, currency: page.primaryLang === "en" ? "USD" : "SAR", vatIncluded: true }
      }
      accounts={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, rates: a.rates.map(rate) }))}
      // One bundle per page: older pages may have more; the first one is kept.
      bundle={bundles[0] ? { name: bundles[0].name ?? "", nameEn: bundles[0].nameEn ?? "", accountIds: bundles[0].platforms.map((p) => p.accountId), rates: bundles[0].rates.map(rate) } : null}
      lang={{ primary: page.primaryLang as "ar" | "en", showEnglish: page.primaryLang === "ar" && page.enEnabled }}
    />
  );
}

export default async function RatesPage({ params }: PageProps<"/[locale]/dashboard/rates">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("rates")} section="rates" />
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
