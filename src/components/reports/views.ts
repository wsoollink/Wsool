import "server-only";
import type { ReportView } from "@/components/reports/ReportsManager";
import { toIntlLocale, type Locale } from "@/i18n/config";
import type { ReportRow } from "@/lib/ad-reports";
import { siteOrigin } from "@/lib/site-url";

/** Report rows → what the browser component needs (no tokens of revoked links, dates as text). */
export function toReportViews(rows: ReportRow[], lang: Locale): ReportView[] {
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  return rows.map((r) => ({
    id: r.id, brand: r.brand, created: date.format(r.createdAt), views: r.views, revoked: r.revoked,
    link: r.token ? `${siteOrigin()}/r/${r.token}` : null, totals: r.totals,
    posts: r.posts.map((p) => ({
      id: p.id, platform: p.platform, url: p.url, title: p.title, thumbUrl: p.thumbUrl, views: p.metrics.views ?? null, likes: p.metrics.likes ?? null,
      syncError: p.syncError, lastSync: p.lastSyncAt ? date.format(p.lastSyncAt) : null, handle: p.handle,
    })),
  }));
}

