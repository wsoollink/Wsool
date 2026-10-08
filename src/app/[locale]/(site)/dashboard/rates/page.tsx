import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { RatesEditor } from "./RatesEditor";

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
      bundles={bundles.map((b) => ({ name: b.name ?? "", nameEn: b.nameEn ?? "", accountIds: b.platforms.map((p) => p.accountId), rates: b.rates.map(rate) }))}
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
      <h1 className="text-2xl font-bold">{t("rates")}</h1>
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
