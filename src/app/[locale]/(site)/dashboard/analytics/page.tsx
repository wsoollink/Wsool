import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BarChart3, Eye, Lock, Mail, MessageCircle, Percent, Users } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { KpiStrip, type Kpi } from "@/components/ui/KpiStrip";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { today } from "@/lib/analytics";
import { analyticsReport, periodTotals, RANGES, type Range } from "@/lib/analytics-report";
import { PLATFORM_NAMES } from "@/config/platforms";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/format";
import { DailyChart } from "./DailyChart";
import { PageHeader } from "@/components/dashboard/PageHeader";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Share bars from the design: label | bar | percent (of all visits). */
function ShareList({ title, hint, rows, total, label, lang, empty }: { title: string; hint?: string; rows: { key: string; count: number }[]; total: number; label: (k: string) => string; lang: Locale; empty: string }) {
  return (
    <Panel title={title} aside={hint} bodyClassName="flex flex-col gap-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const pct = total ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.key} className="grid grid-cols-[110px_1fr_44px] items-center gap-2.5 text-[13px]">
                <span className="truncate">{label(r.key)}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
                  <span className="block h-full rounded-full bg-blue" style={{ width: `${pct}%` }} />
                </span>
                <span dir="ltr" className="text-muted rtl:text-start">{formatPercent(pct, lang)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
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
  // The same number of days just before, for "vs previous period".
  const end = today();
  const prev = await periodTotals(page.id, new Date(end.getTime() - (2 * range - 1) * 86_400_000), new Date(end.getTime() - range * 86_400_000));
  const delta = (cur: number, before: number): Pick<Kpi, "delta" | "note"> => {
    if (!before) return { note: cur ? t("newPeriod") : undefined };
    const pct = Math.round(((cur - before) / before) * 100);
    return { delta: { text: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${formatPercent(Math.abs(pct), lang)}`, tone: pct >= 0 ? "good" : "warn" }, note: t("vsPrevNote") };
  };
  const regions = new Intl.DisplayNames([toIntlLocale(lang)], { type: "region" });
  const contacts = r.whatsapp + r.email;
  const spark = (k: "views") => r.series.slice(-14).map((d) => d[k]);
  const tiles: Kpi[] = [
    { label: t("views"), icon: <Eye aria-hidden="true" size={14} />, value: formatNumber(r.views, lang), ...delta(r.views, prev.views), spark: spark("views") },
    { label: t("visitors"), icon: <Users aria-hidden="true" size={14} />, value: formatNumber(r.visitors, lang) },
    { label: t("whatsapp"), icon: <MessageCircle aria-hidden="true" size={14} />, value: formatNumber(r.whatsapp, lang), ...delta(r.whatsapp, prev.whatsapp) },
    { label: t("email"), icon: <Mail aria-hidden="true" size={14} />, value: formatNumber(r.email, lang), ...delta(r.email, prev.email) },
    { label: t("contactRate"), icon: <Percent aria-hidden="true" size={14} />, value: r.visitors ? formatPercent(Math.round((contacts / r.visitors) * 100), lang) : "—", note: t("contactRateHint") },
  ];
  const deviceTotal = r.devices.reduce((s, d) => s + d.count, 0) || 1;
  const mobilePct = Math.round(((r.devices.find((d) => d.key === "mobile")?.count ?? 0) / deviceTotal) * 100);
  const clickLabel = (c: { kind: string; platform: string | null; targetName?: string | null }) =>
    c.kind === "link" ? t("clickLink", { name: c.targetName ?? t("deleted") }) : c.kind === "service" ? t("clickService", { name: c.targetName ?? t("deleted") }) : c.kind === "whatsapp" ? "WhatsApp" : c.kind === "email" ? t("email") : c.kind === "social" ? t("clickSocial", { platform: c.platform ? PLATFORM_NAMES[c.platform as keyof typeof PLATFORM_NAMES] : "" }) : t("clickWork", { platform: c.platform ? PLATFORM_NAMES[c.platform as keyof typeof PLATFORM_NAMES] : "" });

  return (
    <div className="flex flex-col gap-4">
      {/* Date range first, one row above everything it scopes. */}
      <nav aria-label={t("range")} className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-hover p-1 md:w-[420px]">
        {RANGES.map((d) => (
          <Link
            key={d} href={`/dashboard/analytics?range=${d}`} aria-current={d === range ? "page" : undefined}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg text-[13px] font-semibold md:min-h-9 ${d === range ? "bg-card text-navy shadow-card" : "text-muted hover:text-navy"}`}
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
          <KpiStrip items={tiles} />
          <Card><DailyChart series={r.series} /></Card>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ShareList title={t("countries")} rows={r.countries} total={r.views} label={(k) => regions.of(k) ?? k} lang={lang} empty={t("noData")} />
            <ShareList title={t("referrers")} hint={t("referrersHint")} rows={r.referrers} total={r.views} label={(k) => k} lang={lang} empty={t("direct")} />
            <Panel title={t("devices")} bodyClassName="flex flex-col gap-3">
              <div className="flex items-center gap-5">
                <div
                  role="img" aria-label={t("devicesAlt", { mobile: formatPercent(mobilePct, lang), desktop: formatPercent(100 - mobilePct, lang) })}
                  className="size-[132px] shrink-0 rounded-full"
                  style={{ background: `conic-gradient(var(--color-blue) 0 ${mobilePct}%, var(--color-line-soft) ${mobilePct}% 100%)`, mask: "radial-gradient(circle, transparent 46%, #000 47%)", WebkitMask: "radial-gradient(circle, transparent 46%, #000 47%)" }}
                />
                <ul className="flex flex-col gap-2 text-sm">
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-blue" />{t("device.mobile")} <b dir="ltr">{formatPercent(mobilePct, lang)}</b></li>
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-line" />{t("device.desktop")} <b dir="ltr">{formatPercent(100 - mobilePct, lang)}</b></li>
                </ul>
              </div>
              <p className="text-xs text-muted">{t("devicesHint")}</p>
            </Panel>
            <Panel title={t("topClicks")} bodyClassName="flex flex-col gap-1 !py-2">
              {r.topClicks.length === 0 ? <p className="text-sm text-muted">{t("noData")}</p> : (
                <ol className="flex flex-col divide-y divide-line-soft">
                  {r.topClicks.map((c, i) => (
                    <li key={`${c.kind}-${c.platform}-${c.targetId}`} className="flex min-h-11 items-center gap-3">
                      <span className="w-6 text-[13px] font-bold text-muted">{i + 1}</span>
                      <span className="flex-1 text-sm">{clickLabel(c)}</span>
                      <span dir="ltr" className="font-semibold tabular-nums">{formatNumber(c.count, lang)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
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
