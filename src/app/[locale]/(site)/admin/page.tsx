import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
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

function Tile({ label, value, note, tone = "muted" }: { label: string; value: string; note?: string; tone?: "muted" | "good" | "bad" | "warn" }) {
  const color = { muted: "text-muted", good: "text-good", bad: "text-bad", warn: "text-warn" }[tone];
  return (
    <Card className="flex flex-col gap-1.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-numbers text-[30px] leading-none font-black">{value}</span>
      {note && <span className={`text-xs font-medium ${color}`}>{note}</span>}
    </Card>
  );
}

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
    db.user.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 29 * DAY - (now.getTime() % DAY)) } }, select: { createdAt: true } }),
    db.page.count({ where: { deletedAt: null } }),
    db.page.count({ where: { isPublished: true, deletedAt: null } }),
    db.page.count({ where: { deletedAt: null, socialAccounts: { some: { verificationStatus: "verified", verifiedUntil: { gt: now } } } } }),
    db.newsletterSubscriber.count({ where: { status: "confirmed" } }),
  ]);
  const showMoney = can(admin, "revenue.view");
  const finance = showMoney ? await financeReport(2) : null;
  const oldestHours = oldest ? Math.floor((now.getTime() - oldest.createdAt.getTime()) / 3_600_000) : 0;

  // Signups per UTC day, last 30 days.
  const start = Math.floor(now.getTime() / DAY) - 29;
  const days = Array.from({ length: 30 }, (_, i) => ({ day: new Date((start + i) * DAY), n: 0 }));
  for (const s of signups) {
    const i = Math.floor(s.createdAt.getTime() / DAY) - start;
    if (i >= 0 && i < 30) days[i].n++;
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  const dayLabel = new Intl.DateTimeFormat(toIntlLocale(lang), { day: "numeric", month: "short", timeZone: "UTC" });

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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile label={t("creators")} value={formatNumber(users, lang)} note={t("thisWeek", { n: formatNumber(newThisWeek, lang) })} tone={newThisWeek ? "good" : "muted"} />
        <Tile label={t("paid")} value={formatNumber(paid, lang)} note={t("ofCreators", { p: users ? Math.round((paid / users) * 100) : 0 })} />
        <Tile label={t("trialing")} value={formatNumber(trialing, lang)} note={t("endingWeek", { n: formatNumber(trialsEnding, lang) })} tone={trialsEnding ? "warn" : "muted"} />
        {finance && (
          <Tile
            label={t("mrr")} value={formatAmount(Math.round(finance.unit.mrr), lang)}
            note={finance.unit.mrrGrowth === null ? t("sar") : `${t("sar")} · ${pct(finance.unit.mrrGrowth * 100)}`}
            tone={finance.unit.mrrGrowth === null ? "muted" : finance.unit.mrrGrowth >= 0 ? "good" : "bad"}
          />
        )}
        <Tile label={t("pendingTile")} value={formatNumber(waiting, lang)} note={oldest ? t("oldest", { h: oldestHours }) : t("onTime")} tone={oldestHours >= 24 ? "warn" : "muted"} />
        <Tile label={t("conversion")} value={trialsEnded ? `${Math.round((converted / trialsEnded) * 100)}%` : "—"} note={t("conversionHint", { n: formatNumber(trialsEnded, lang) })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold">{t("signups")}</h2>
            <span className="text-xs text-muted">{t("last30")}</span>
          </div>
          <div className="flex h-40 items-end gap-[3px]" role="img" aria-label={t("signupsAria", { n: formatNumber(signups.length, lang) })}>
            {days.map((d) => (
              <span key={d.day.toISOString()} title={`${dayLabel.format(d.day)}: ${d.n}`} className="flex-1 rounded-t-[4px] bg-blue/80" style={{ height: `${Math.max(3, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-muted">
            <span>{dayLabel.format(days[0].day)}</span>
            <span>{dayLabel.format(days[29].day)}</span>
          </div>
        </Card>

        {can(admin, "verifications.view") && (
          <div className="flex flex-col justify-between gap-4 rounded-card bg-navy p-5 text-white">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-white/70">{t("queueTitle")}</span>
              <span className="font-numbers text-[44px] leading-none font-black">{formatNumber(waiting, lang)}</span>
              <span className="text-sm text-white/80">{t("queueSplit", { accounts: pending, licenses: licensesPending })}</span>
            </div>
            {oldestHours >= 24 && (
              <p className="flex items-center gap-2 rounded-xl bg-[#F59E0B]/20 px-3 py-2 text-[13px] text-[#FCD34D]">
                <Clock aria-hidden="true" size={16} /> {t("oldestLate", { h: oldestHours, hours: REVIEW_HOURS })}
              </p>
            )}
            <Link href="/admin/verifications" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-navy">
              {t("startReview")} <Arrow aria-hidden="true" size={16} />
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">{t("funnelTitle")}</h2>
          <ol className="flex flex-col gap-2.5">
            {funnel.map((f) => (
              <li key={f.label} className="flex flex-col gap-1">
                <span className="flex justify-between text-[13px]"><span>{f.label}</span><b className="font-numbers">{formatNumber(f.n, lang)}</b></span>
                <span className="h-2 overflow-hidden rounded-full bg-navy/5"><span className="block h-full rounded-full bg-blue" style={{ width: `${users ? (f.n / users) * 100 : 0}%` }} /></span>
              </li>
            ))}
          </ol>
        </Card>

        {isOwner && (
          <Card className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold">{t("activity")}</h2>
              <Link href="/admin/audit" className="inline-flex min-h-11 items-center text-[13px] font-bold text-blue">{t("seeAll")}</Link>
            </div>
            {activity.length === 0 ? (
              <p className="text-sm text-muted">{t("noActivity")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-navy/6">
                {activity.map((a, i) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <span aria-hidden="true" className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-navy/5 text-xs font-bold uppercase">{a.actorEmail[0]}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">{sentences[i]}</span>
                      <span className="text-xs text-muted"><bdi dir="ltr">{a.actorEmail}</bdi> · {since(a.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {can(admin, "users.view") && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">{t("newsletter", { n: formatNumber(subscribers, lang) })}</p>
            <p className="text-sm text-muted">{t("newsletterHint")}</p>
          </div>
          {/* A route handler download, not a page: plain <a>. */}
          <a href="/api/admin/newsletter" download className="inline-flex min-h-11 items-center rounded-full bg-navy/5 px-5 text-sm font-bold">{t("exportCsv")}</a>
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
    <div className="flex flex-col gap-4">
      <AdminHeader title={t("overview")} subtitle={(await getTranslations("Admin.sub"))("overview")} />
      <Suspense fallback={null}><Overview lang={locale} /></Suspense>
    </div>
  );
}
