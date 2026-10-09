import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BarChart3, Lock } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { analyticsReport, RANGES, type Range } from "@/lib/analytics-report";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/format";
import { DailyChart } from "./DailyChart";
import { PageHeader } from "@/components/dashboard/PageHeader";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Horizontal bars for a top-N list: one hue, value in text, never color alone. */
function TopList({ title, rows, label, lang, empty }: { title: string; rows: { key: string; count: number }[]; label: (k: string) => string; lang: Locale; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between gap-2"><span className="truncate">{label(r.key)}</span><span className="font-medium">{formatNumber(r.count, lang)}</span></span>
              <span className="h-1.5 rounded-full bg-navy/5" aria-hidden="true">
                <span className="block h-full rounded-full bg-blue" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function Report({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  const { user, page } = await requireCreator();
  const t = await getTranslations("Analytics");
  const sub = await db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } });

  if (!hasPro(sub) && !FREE_LIMITS.analytics) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <Lock aria-hidden="true" size={24} className="text-muted" />
        <h2 className="font-bold">{t("lockedTitle")}</h2>
        <p className="text-sm text-muted">{t("lockedBody")}</p>
        <Link href="/dashboard/subscription" className={buttonClasses("primary")}>{t("upgrade")}</Link>
      </Card>
    );
  }

  const raw = Number((await searchParams).range);
  const range: Range = (RANGES as readonly number[]).includes(raw) ? (raw as Range) : 30;
  const r = await analyticsReport(page.id, range);
  const regions = new Intl.DisplayNames([toIntlLocale(lang)], { type: "region" });
  const contacts = r.whatsapp + r.email;
  const tiles = [
    { label: t("views"), value: formatNumber(r.views, lang) },
    { label: t("visitors"), value: formatNumber(r.visitors, lang) },
    { label: t("whatsapp"), value: formatNumber(r.whatsapp, lang) },
    { label: t("email"), value: formatNumber(r.email, lang) },
    { label: t("contactRate"), value: r.visitors ? formatPercent(Math.round((contacts / r.visitors) * 100), lang) : "—" },
    { label: t("socialWork"), value: formatNumber(r.social + r.work, lang) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Date range first, one row above everything it scopes. */}
      <nav aria-label={t("range")} className="flex flex-wrap gap-2">
        {RANGES.map((d) => (
          <Link
            key={d} href={`/dashboard/analytics?range=${d}`} aria-current={d === range ? "page" : undefined}
            className={`min-h-11 content-center rounded-full px-4 text-sm font-medium ${d === range ? "bg-navy text-white" : "border border-line bg-card"}`}
          >
            {t("lastDays", { n: d })}
          </Link>
        ))}
      </nav>

      {r.views === 0 ? (
        <Card className="flex flex-col items-start gap-2">
          <BarChart3 aria-hidden="true" size={24} className="text-muted" />
          <p className="font-bold">{t("emptyTitle")}</p>
          <p className="text-sm text-muted">{t("emptyBody", { link: `wsool.link/${page.username}` })}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {tiles.map((tile) => (
              <Card key={tile.label} className="flex flex-col gap-1 p-4">
                <span className="text-xs text-muted">{tile.label}</span>
                <span className="font-numbers text-2xl font-bold">{tile.value}</span>
              </Card>
            ))}
          </div>
          <Card><DailyChart series={r.series} /></Card>
          <div className="grid gap-3 md:grid-cols-3">
            <TopList title={t("countries")} rows={r.countries} label={(k) => regions.of(k) ?? k} lang={lang} empty={t("noData")} />
            <TopList title={t("referrers")} rows={r.referrers} label={(k) => k} lang={lang} empty={t("direct")} />
            <TopList title={t("devices")} rows={r.devices} label={(k) => t(`device.${k as "mobile" | "tablet" | "desktop"}`)} lang={lang} empty={t("noData")} />
          </div>
          <p className="text-xs text-muted">{t("privacy")}</p>
        </>
      )}
    </div>
  );
}

export default async function AnalyticsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/analytics">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={nav("analytics")} section="analytics" />
      <Suspense fallback={null}><Report lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
