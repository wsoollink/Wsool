import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoCard } from "./demo/DemoCard";
import { ArrowLeft, ArrowRight, BadgeCheck, Banknote, Clock, Download, Hourglass, Mail, Sparkles, TrendingUp, Users } from "lucide-react";
import { AreaChart } from "@/components/charts/AreaChart";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { KpiStrip, type Kpi } from "@/components/ui/KpiStrip";
import { Pill } from "@/components/ui/Pill";
import { REVIEW_HOURS } from "@/config/verification";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { auditSentences } from "@/lib/audit-text";
import { db } from "@/lib/db";
import { financeReport } from "@/lib/finance";
import { formatAmount, formatNumber } from "@/lib/format";

const DAY = 86_400_000;
const PAID = ["active", "past_due"] as const;
/** Signed percent, isolated so the sign stays on the right side in Arabic. */
const pct = (v: number) => `⁦${v > 0 ? "+" : ""}${Math.round(v)}%⁩`;

/** Overview from the admin design: 6 tiles, signups chart, verification card, activity, funnel. */
async function Overview({ lang }: { lang: Locale }) {
  const admin = await requireAdmin();
  const t = await getTranslations("Admin.overview");
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY), monthAgo = new Date(now.getTime() - 30 * DAY), weekAhead = new Date(now.getTime() + 7 * DAY);
  const [users, newThisWeek, paid, trialing, trialsEnding, pending, oldest, licensesPending, trialsEnded, converted, signups, claimed, published, verified, subscribers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.subscription.count({ where: { status: { in: [...PAID] } } }),
    db.subscription.count({ where: { status: "trialing", trialEndsAt: { gt: now } } }),
    db.subscription.count({ where: { status: "trialing", trialEndsAt: { gt: now, lte: weekAhead } } }),
    db.verificationRequest.count({ where: { status: "pending" } }),
    db.verificationRequest.findFirst({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    db.license.count({ where: { verificationStatus: "in_review" } }),
    db.subscription.count({ where: { trialEndsAt: { gte: monthAgo, lte: now } } }),
    db.subscription.count({ where: { trialEndsAt: { gte: monthAgo, lte: now }, status: { in: [...PAID] } } }),
    db.user.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 59 * DAY - (now.getTime() % DAY)) } }, select: { createdAt: true } }),
    db.page.count({ where: { deletedAt: null } }),
    db.page.count({ where: { isPublished: true, deletedAt: null } }),
    db.page.count({ where: { deletedAt: null, socialAccounts: { some: { verificationStatus: "verified", verifiedUntil: { gt: now } } } } }),
    db.newsletterSubscriber.count({ where: { status: "confirmed" } }),
  ]);
  const showMoney = can(admin, "revenue.view");
  const finance = showMoney ? await financeReport(2) : null;
  const oldestHours = oldest ? Math.floor((now.getTime() - oldest.createdAt.getTime()) / 3_600_000) : 0;

  // Signups per UTC day: the last 30 days and the 30 before (dashed line).
  const start = Math.floor(now.getTime() / DAY) - 59;
  const all = Array.from({ length: 60 }, (_, i) => ({ day: new Date((start + i) * DAY), n: 0 }));
  for (const s of signups) {
    const i = Math.floor(s.createdAt.getTime() / DAY) - start;
    if (i >= 0 && i < 60) all[i].n++;
  }
  const days = all.slice(30);
  const dayLabel = new Intl.DateTimeFormat(toIntlLocale(lang), { day: "numeric", month: "long", timeZone: "UTC" });
  const recent = days.reduce((a, d) => a + d.n, 0);
  const before = all.slice(0, 30).reduce((a, d) => a + d.n, 0);
  const points = days.map((d, i) => ({ label: dayLabel.format(d.day), value: d.n, prev: all[i].n, text: t("signupsCount", { n: d.n }) }));

  const funnel = [
    { label: t("funnel.signedUp"), n: users },
    { label: t("funnel.claimed"), n: claimed },
    { label: t("funnel.published"), n: published },
    { label: t("funnel.verified"), n: verified },
    { label: t("funnel.paid"), n: paid },
  ];

  const isOwner = can(admin, "owner");
  const activity = isOwner ? await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }) : [];
  const sentences = await auditSentences(activity);
  const ago = new Intl.RelativeTimeFormat(toIntlLocale(lang), { numeric: "auto" });
  const since = (d: Date) => {
    const mins = Math.round((d.getTime() - now.getTime()) / 60_000);
    if (mins > -60) return ago.format(mins, "minute");
    if (mins > -1440) return ago.format(Math.round(mins / 60), "hour");
    return ago.format(Math.round(mins / 1440), "day");
  };
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const waiting = pending + licensesPending;

  const kpis: Kpi[] = [
    { label: t("creators"), icon: <Users aria-hidden="true" size={14} />, value: formatNumber(users, lang), delta: newThisWeek ? { text: `+${formatNumber(newThisWeek, lang)}`, tone: "good" } : undefined, note: newThisWeek ? t("weekNote") : t("thisWeek", { n: 0 }), spark: days.slice(-14).map((d) => d.n) },
    { label: t("paid"), icon: <Sparkles aria-hidden="true" size={14} />, value: formatNumber(paid, lang), note: t("ofCreators", { p: users ? Math.round((paid / users) * 100) : 0 }) },
    { label: t("trialing"), icon: <Hourglass aria-hidden="true" size={14} />, value: formatNumber(trialing, lang), ...(trialsEnding ? { delta: { text: formatNumber(trialsEnding, lang), tone: "warn" as const }, note: t("endingNote") } : { note: t("endingWeek", { n: 0 }) }) },
    ...(finance
      ? [{
          label: t("mrr"), icon: <Banknote aria-hidden="true" size={14} />, value: `${formatAmount(Math.round(finance.unit.mrr), lang)}`,
          ...(finance.unit.mrrGrowth === null ? { note: t("sar") } : { delta: { text: pct(finance.unit.mrrGrowth * 100), tone: finance.unit.mrrGrowth >= 0 ? ("good" as const) : ("warn" as const) }, note: t("sar") }),
        }]
      : []),
    { label: t("conversion"), icon: <TrendingUp aria-hidden="true" size={14} />, value: trialsEnded ? `${Math.round((converted / trialsEnded) * 100)}%` : "—", note: t("conversionHint", { n: formatNumber(trialsEnded, lang) }) },
  ];

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <KpiStrip items={kpis} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={t("signups")}
          aside={
            <span className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-3.5 rounded bg-blue" />{t("last30")}</span>
              <span className="hidden items-center gap-1.5 sm:inline-flex"><span aria-hidden="true" className="h-0.5 w-3.5 bg-[repeating-linear-gradient(90deg,var(--color-faint)_0_4px,transparent_4px_7px)]" />{t("previousPeriod")}</span>
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span dir="ltr" className="font-numbers text-[28px] leading-none tabular-nums">{formatNumber(recent, lang)}</span>
            {before > 0 && <Pill tone={recent >= before ? "good" : "warn"} dot={false}><bdi dir="ltr">{recent >= before ? "↑ " : "↓ "}{pct(((recent - before) / before) * 100).replace(/[⁦⁩]/g, "")}</bdi></Pill>}
          </div>
          <AreaChart
            points={points} ariaLabel={t("signupsAria", { n: formatNumber(recent, lang) })}
            ticks={[0, 10, 20, 29].map((i) => dayLabel.format(days[i].day))}
          />
        </Panel>

        {can(admin, "verifications.view") && (
          <div className="flex flex-col gap-4 rounded-card bg-[linear-gradient(135deg,#021941,#0a2a66)] p-5 text-white shadow-card ring-1 ring-white/10">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/12 px-2.5 py-px text-[11.5px] font-semibold"><BadgeCheck aria-hidden="true" size={13} />{t("waiting")}</span>
            <div className="flex flex-col gap-1">
              <span className="font-numbers text-[44px] leading-none">{formatNumber(waiting, lang)}</span>
              <span className="text-[14px] font-semibold">{t("queueTitle")}</span>
              <span className="text-[13px] text-white/70">{t("queueSplit", { accounts: pending, licenses: licensesPending })}{oldest ? ` · ${t("oldest", { h: oldestHours })}` : ""}</span>
            </div>
            {oldestHours >= 24 && (
              <p className="flex items-center gap-2 rounded-xl bg-[#F59E0B]/20 px-3 py-2 text-[13px] text-[#FCD34D]">
                <Clock aria-hidden="true" size={16} /> {t("oldestLate", { h: oldestHours, hours: REVIEW_HOURS })}
              </p>
            )}
            <Link href="/admin/verifications" className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#021941]">
              {t("startReview")} <Arrow aria-hidden="true" size={16} />
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={t("funnelTitle")}>
          <ol className="flex flex-col gap-3.5">
            {funnel.map((f) => (
              <li key={f.label} className="flex flex-col gap-1.5">
                <span className="flex justify-between text-[13px]"><span>{f.label}</span><b dir="ltr" className="font-semibold tabular-nums">{formatNumber(f.n, lang)}</b></span>
                <span className="h-1.5 overflow-hidden rounded-full bg-line-soft"><span className="block h-full rounded-full bg-blue" style={{ width: `${users ? (f.n / users) * 100 : 0}%` }} /></span>
              </li>
            ))}
          </ol>
        </Panel>

        {isOwner && (
          <Panel
            title={t("activity")} flush
            aside={<Link href="/admin/audit" className="inline-flex min-h-11 items-center font-semibold text-blue md:min-h-0">{t("seeAll")}</Link>}
          >
            {activity.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t("noActivity")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line-soft">
                {activity.map((a, i) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <span aria-hidden="true" className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[11px] font-bold text-blue uppercase">{a.actorEmail[0]}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13.5px]">{sentences[i]}</span>
                      <span className="text-[11.5px] text-muted"><bdi dir="ltr">{a.actorEmail}</bdi> · {since(a.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      {isOwner && <DemoCard />}

      {can(admin, "users.view") && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue"><Mail aria-hidden="true" size={18} /></span>
            <div>
              <p className="text-[14px] font-bold">{t("newsletter", { n: formatNumber(subscribers, lang) })}</p>
              <p className="text-[13px] text-muted">{t("newsletterHint")}</p>
            </div>
          </div>
          {/* A route handler download, not a page: plain <a>. */}
          <a href="/api/admin/newsletter" download className={buttonClasses("secondary")}><Download aria-hidden="true" size={15} />{t("exportCsv")}</a>
        </Card>
      )}
    </div>
  );
}

export default async function AdminOverview({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col">
      <AdminHeader title={t("overview")} subtitle={(await getTranslations("Admin.sub"))("overview")} />
      <Suspense fallback={null}><Overview lang={locale} /></Suspense>
    </div>
  );
}
