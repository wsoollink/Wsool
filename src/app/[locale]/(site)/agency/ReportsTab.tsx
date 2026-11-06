import { getTranslations } from "next-intl/server";
import { ReportsManager } from "@/components/reports/ReportsManager";
import { toReportViews } from "@/components/reports/views";
import type { Locale } from "@/i18n/config";
import { REPORT_PLATFORMS } from "@/lib/ad-report-links";
import { listReports } from "@/lib/ad-reports";
import { db } from "@/lib/db";
import {
  addAgencyReportPosts, createAgencyReport, deleteAgencyReport, refreshAgencyReportPost, removeAgencyReportPost, renewAgencyReportLink, revokeAgencyReportLink,
} from "./report-actions";

/** Agency "Reports" tab: one campaign report across several linked creators (those who allowed "content"). */
export async function ReportsTab({ agencyId, lang }: { agencyId: string; lang: Locale }) {
  const t = await getTranslations("AdReports");
  const [accounts, rows] = await Promise.all([
    db.socialAccount.findMany({
      where: {
        platform: { in: [...REPORT_PLATFORMS] }, connection: { status: "active" },
        page: { deletedAt: null, agencyLinks: { some: { agencyId, status: "active", canContent: true } } },
      },
      orderBy: [{ pageId: "asc" }, { sort: "asc" }],
      select: { id: true, platform: true, handle: true, page: { select: { username: true, translations: { select: { lang: true, fullName: true } } } } },
    }),
    listReports({ agencyId }),
  ]);
  const name = (p: (typeof accounts)[number]["page"]) => p.translations.find((x) => x.lang === lang)?.fullName || p.translations[0]?.fullName || p.username;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("agencyHint")}</p>
      <ReportsManager
        reports={toReportViews(rows, lang)}
        accounts={accounts.map((a) => ({ id: a.id, platform: a.platform, label: `${name(a.page)} · @${a.handle}` }))}
        actions={{ create: createAgencyReport, add: addAgencyReportPosts, remove: removeAgencyReportPost, refresh: refreshAgencyReportPost, renew: renewAgencyReportLink, revoke: revokeAgencyReportLink, del: deleteAgencyReport }}
        defaultLang={lang}
      />
    </div>
  );
}
