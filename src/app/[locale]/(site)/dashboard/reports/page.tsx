import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProNotice } from "@/components/dashboard/ProNotice";
import { SectionSkeleton } from "@/components/dashboard/SectionSkeleton";
import { ReportsManager } from "@/components/reports/ReportsManager";
import { toReportViews } from "@/components/reports/views";
import { hasPro } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { REPORT_PLATFORMS } from "@/lib/ad-report-links";
import { listReports } from "@/lib/ad-reports";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { addAdReportPosts, createAdReport, deleteAdReport, refreshAdReportPost, removeAdReportPost, renewAdReportLink, revokeAdReportLink } from "./actions";

async function Reports({ lang }: { lang: Locale }) {
  // Unscoped: only the creator themself (an agency uses its own Reports tab).
  const { page } = await requireCreator();
  const t = await getTranslations("AdReports");
  const [sub, accounts, rows] = await Promise.all([
    db.subscription.findUnique({ where: { userId: page.userId }, select: { status: true, trialEndsAt: true } }),
    db.socialAccount.findMany({
      where: { pageId: page.id, platform: { in: [...REPORT_PLATFORMS] }, connection: { status: "active" } },
      orderBy: { sort: "asc" }, select: { id: true, platform: true, handle: true },
    }),
    listReports({ pageId: page.id, userId: page.userId }),
  ]);
  const pro = hasPro(sub);
  return (
    <div className="flex flex-col gap-4">
      {!pro && <ProNotice text={t("proOnly")} />}
      {(pro || rows.length > 0) && (
        <ReportsManager
          reports={toReportViews(rows, lang)}
          accounts={pro ? accounts.map((a) => ({ id: a.id, platform: a.platform, label: `@${a.handle}` })) : []}
          actions={{ create: createAdReport, add: addAdReportPosts, remove: removeAdReportPost, refresh: refreshAdReportPost, renew: renewAdReportLink, revoke: revokeAdReportLink, del: deleteAdReport }}
          defaultLang={page.primaryLang as "ar" | "en"}
          accountsHref="/dashboard/accounts"
        />
      )}
    </div>
  );
}

/** Ad reports (owner, Nov 2026, Pro): campaign results from the linked accounts, shared with the brand by a private link. */
export default async function ReportsPage({ params }: PageProps<"/[locale]/dashboard/reports">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("reports")} section="reports" />
      <Suspense fallback={<SectionSkeleton />}><Reports lang={locale} /></Suspense>
    </div>
  );
}
