import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BarChart3, Lock } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-bold">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const pct = total ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.key} className="grid grid-cols-[110px_1fr_44px] items-center gap-2.5 text-[13px]">
                <span className="truncate">{label(r.key)}</span>
                <span className="h-2 overflow-hidden rounded-full bg-navy/5" aria-hidden="true">
                  <span className="block h-full rounded-full bg-blue" style={{ width: `${pct}%` }} />
                </span>
                <span dir="ltr" className="text-muted rtl:text-start">{formatPercent(pct, lang)}</span>
              </li>
            );
          })}
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
  // The same number of days just before, for "vs previous period".
  const end = today();
  const prev = await periodTotals(page.id, new Date(end.getTime() - (2 * range - 1) * 86_400_000), new Date(end.getTime() - range * 86_400_000));
  const delta = (cur: number, before: number) => {
    if (!before) return { text: cur ? t("newPeriod") : "", tone: "text-muted" };
    const pct = Math.round(((cur - before) / before) * 100);
    return { text: t("vsPrev", { change: `\u2066${pct > 0 ? "+" : pct < 0 ? "−" : ""}${formatPercent(Math.abs(pct), lang)}\u2069` }), tone: pct >= 0 ? "text-good" : "text-warn" };
  };
  const regions = new Intl.DisplayNames([toIntlLocale(lang)], { type: "region" });
  const contacts = r.whatsapp + r.email;
  const tiles = [
    { label: t("views"), value: formatNumber(r.views, lang), d: delta(r.views, prev.views) },
    { label: t("visitors"), value: formatNumber(r.visitors, lang), d: { text: "", tone: "" } },
    { label: t("whatsapp"), value: formatNumber(r.whatsapp, lang), d: delta(r.whatsapp, prev.whatsapp) },
    { label: t("email"), value: formatNumber(r.email, lang), d: delta(r.email, prev.email) },
    { label: t("contactRate"), value: r.visitors ? formatPercent(Math.round((contacts / r.visitors) * 100), lang) : "—", d: { text: t("contactRateHint"), tone: "text-muted" }, wide: true },
  ];
  const deviceTotal = r.devices.reduce((s, d) => s + d.count, 0) || 1;
  const mobilePct = Math.round(((r.devices.find((d) => d.key === "mobile")?.count ?? 0) / deviceTotal) * 100);
  const clickLabel = (c: { kind: string; platform: string | null }) =>
    c.kind === "whatsapp" ? "WhatsApp" : c.kind === "email" ? t("email") : c.kind === "social" ? t("clickSocial", { platform: c.platform ? PLATFORM_NAMES[c.platform as keyof typeof PLATFORM_NAMES] : "" }) : t("clickWork", { platform: c.platform ? PLATFORM_NAMES[c.platform as keyof typeof PLATFORM_NAMES] : "" });

  return (
    <div className="flex flex-col gap-4">
      {/* Date range first, one row above everything it scopes. */}
      <nav aria-label={t("range")} className="grid grid-cols-3 gap-1 rounded-[14px] bg-navy/5 p-1">
        {RANGES.map((d) => (
          <Link
            key={d} href={`/dashboard/analytics?range=${d}`} aria-current={d === range ? "page" : undefined}
            className={`inline-flex min-h-11 items-center justify-center rounded-[10px] text-[13.5px] font-bold ${d === range ? "bg-white text-navy shadow-card" : "text-muted"}`}
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((tile) => (
              <Card key={tile.label} className={`flex flex-col gap-1 ${tile.wide ? "col-span-2 md:col-span-4" : ""}`}>
                <span className="text-[13px] text-muted">{tile.label}</span>
                <span dir="ltr" className="font-numbers text-[28px] font-black rtl:text-end">{tile.value}</span>
                {tile.d.text && <span className={`text-[12.5px] font-medium ${tile.d.tone}`}>{tile.d.text}</span>}
              </Card>
            ))}
          </div>
          <Card><DailyChart series={r.series} /></Card>
          <div className="grid gap-3 md:grid-cols-2">
            <ShareList title={t("countries")} rows={r.countries} total={r.views} label={(k) => regions.of(k) ?? k} lang={lang} empty={t("noData")} />
            <ShareList title={t("referrers")} hint={t("referrersHint")} rows={r.referrers} total={r.views} label={(k) => k} lang={lang} empty={t("direct")} />
            <Card className="flex flex-col gap-3">
              <h2 className="font-bold">{t("devices")}</h2>
              <div className="flex items-center gap-5">
                <div
                  role="img" aria-label={t("devicesAlt", { mobile: formatPercent(mobilePct, lang), desktop: formatPercent(100 - mobilePct, lang) })}
                  className="size-[132px] shrink-0 rounded-full"
                  style={{ background: `conic-gradient(var(--color-blue) 0 ${mobilePct}%, rgba(2,25,65,0.12) ${mobilePct}% 100%)`, mask: "radial-gradient(circle, transparent 46%, #000 47%)", WebkitMask: "radial-gradient(circle, transparent 46%, #000 47%)" }}
                />
                <ul className="flex flex-col gap-2 text-sm">
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-blue" />{t("device.mobile")} <b dir="ltr">{formatPercent(mobilePct, lang)}</b></li>
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-navy/12" />{t("device.desktop")} <b dir="ltr">{formatPercent(100 - mobilePct, lang)}</b></li>
                </ul>
              </div>
              <p className="text-xs text-muted">{t("devicesHint")}</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <h2 className="mb-1 font-bold">{t("topClicks")}</h2>
              {r.topClicks.length === 0 ? <p className="text-sm text-muted">{t("noData")}</p> : (
                <ol className="flex flex-col divide-y divide-navy/6">
                  {r.topClicks.map((c, i) => (
                    <li key={`${c.kind}-${c.platform}`} className="flex min-h-11 items-center gap-3">
                      <span className="w-6 text-[13px] font-bold text-muted">{i + 1}</span>
                      <span className="flex-1 text-sm">{clickLabel(c)}</span>
                      <span dir="ltr" className="font-numbers font-black">{formatNumber(c.count, lang)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
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
