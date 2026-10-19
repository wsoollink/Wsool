import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Eye, Globe, Lock, Mail, MessageCircle, Sparkles } from "lucide-react";
import { AreaChart } from "@/components/charts/AreaChart";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { KpiStrip, type Kpi } from "@/components/ui/KpiStrip";
import { Pill } from "@/components/ui/Pill";
import { FREE_LIMITS, PRICES, TRIAL_DAYS, hasPro, trialDaysLeft } from "@/config/plans";
import { PLATFORM_NAMES } from "@/config/platforms";
import { verificationDisplay } from "@/config/verification";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { today } from "@/lib/analytics";
import { analyticsReport, dailyCounts } from "@/lib/analytics-report";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/format";
import { pageLanguages } from "@/lib/page-language";
import { siteOrigin } from "@/lib/site-url";
import { LinkCard, ShareButton } from "./LinkCard";
import { SectionSkeleton } from "@/components/dashboard/SectionSkeleton";

const DAY = 86_400_000;

/** Dashboard home from the design: link card, plan/trial, 30-day stats, visits, completion, verification. */
async function Home({ lang }: { lang: Locale }) {
  const { user, page } = await requireCreator();
  const t = await getTranslations("Home");
  const tpl = await getTranslations("AppearancePage.templates");
  const locale = toIntlLocale(lang);
  const now = new Date();

  // Stats (last 30 days vs the 30 before, per-day numbers for the chart) are fetched together with
  // everything else, before we know whether the plan shows them: one wait instead of three.
  const stats = Promise.all([analyticsReport(page.id, 30), dailyCounts(page.id, 60)]);
  stats.catch(() => {}); // unused on Free pages: never an unhandled rejection

  // Everything is scoped to the signed-in creator's own page / user id.
  const [sub, translations, accounts, counts, latestViews] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id } }),
    db.pageTranslation.findMany({ where: { pageId: page.id } }),
    db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { audience: { select: { id: true } }, _count: { select: { rates: true } } } }),
    db.page.findUnique({ where: { id: page.id }, select: { _count: { select: { tags: true, brandLogos: true, portfolioItems: true, licenses: true } } } }),
    db.monthlyView.findFirst({ where: { pageId: page.id }, orderBy: { month: "desc" } }),
  ]);
  const pro = hasPro(sub);
  const tr = translations.find((x) => x.lang === page.primaryLang) ?? translations[0];
  const firstName = (tr?.fullName || page.username).split(" ")[0];
  const pageUrl = `${siteOrigin()}/${page.username}`;
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const c = counts?._count;

  // Stats: last 30 days vs the 30 before (analytics is a Pro feature).
  const canStats = pro || FREE_LIMITS.analytics;
  const [report, days] = canStats ? await stats : [null, []];
  // The 30 days before: the first half of the 60 per-day numbers (no extra query).
  const sumOf = (k: "views" | "whatsapp" | "email") => days.slice(0, 30).reduce((n, d) => n + d[k], 0);
  const prev = report ? { views: sumOf("views"), whatsapp: sumOf("whatsapp"), email: sumOf("email") } : null;
  /** KPI delta ("+12%", kept left-to-right by KpiStrip) + "vs last month". */
  const delta = (cur: number, before: number): Pick<Kpi, "delta" | "note"> => {
    if (!before) return { note: cur ? t("new") : t("noChange") };
    const pct = Math.round(((cur - before) / before) * 100);
    return { delta: { text: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${formatPercent(Math.abs(pct), lang)}`, tone: pct >= 0 ? "good" : "warn" }, note: t("vsPrev") };
  };
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const topCountry = report?.countries[0];
  const countryShare = topCountry && report?.views ? Math.round((topCountry.count / report.views) * 100) : 0;

  // Numbers older than this month → nudge to update them.
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const lastNumbers = Math.max(0, ...accounts.map((a) => a.followersUpdatedAt?.getTime() ?? 0), latestViews?.month.getTime() ?? 0);
  const stale = accounts.length > 0 && lastNumbers < monthStart;

  // Completion checklist (missing items become the to-do list).
  const checks = [
    { done: !!page.photoUrl, text: t("todo.photo"), href: "/dashboard/edit" },
    { done: !!tr?.bio, text: t("todo.bio"), href: "/dashboard/edit" },
    { done: accounts.length > 0, text: t("todo.accounts"), href: "/dashboard/accounts" },
    { done: (c?.tags ?? 0) > 0, text: t("todo.tags"), href: "/dashboard/edit" },
    { done: (c?.brandLogos ?? 0) > 0, text: t("todo.brands"), href: "/dashboard/work" },
    { done: (c?.portfolioItems ?? 0) > 0, text: t("todo.work"), href: "/dashboard/work" },
    { done: accounts.some((a) => a._count.rates > 0), text: t("todo.rates"), href: "/dashboard/rates" },
    { done: !!(page.whatsapp || page.contactEmail), text: t("todo.contact"), href: "/dashboard/contact" },
    { done: accounts.some((a) => a.audience), text: t("todo.audience"), href: "/dashboard/accounts" },
    { done: accounts.some((a) => verificationDisplay(a.verificationStatus, a.verifiedUntil) !== "none"), text: t("todo.verify"), href: "/dashboard/verification" },
  ];
  const percent = Math.round((checks.filter((x) => x.done).length / checks.length) * 100);
  const todos = checks.filter((x) => !x.done).slice(0, 4);
  const Chevron = lang === "ar" ? ChevronLeft : ChevronRight;

  const verify = accounts.map((a) => ({ a, status: verificationDisplay(a.verificationStatus, a.verifiedUntil) }));
  const verifiedCount = verify.filter((v) => v.status === "verified" || v.status === "expiring").length;

  const pdfLangs = page.isPublished && (pro || FREE_LIMITS.pdf) ? pageLanguages(page.primaryLang as Locale, page.enEnabled) : null;
  const langs = pageLanguages(page.primaryLang as Locale, page.enEnabled);
  const languages = langs.length > 1 ? t("bothLangs") : langs[0] === "en" ? t("enOnly") : t("arOnly");

  // Per-day numbers: 60 days = this period + the one before (chart), last 14 for sparklines.
  const current = days.slice(30);
  const before = days.slice(0, 30);
  const spark = (k: "views" | "whatsapp" | "email") => current.slice(-14).map((d) => d[k]);
  const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });
  const points = current.map((d, i) => ({ label: dayLabel.format(new Date(d.day)), value: d.views, prev: before[i]?.views ?? 0, text: t("visitsCount", { count: d.views }) }));
  const ticks = [0, 10, 20, 29].map((i) => (current[i] ? dayLabel.format(new Date(current[i].day)) : ""));

  const urgentPlan = sub?.status === "trialing" && pro && trialDaysLeft(sub.trialEndsAt) <= 4;
  const plan = <PlanPanel lang={lang} sub={sub} pro={pro} pageId={page.id} />;
  const nudge = stale && <UpdateNudge t={t} month={month.format(now)} last={lastNumbers ? month.format(new Date(lastNumbers)) : null} />;

  // Completion: the missing steps first, then done ones, 4 rows in all.
  const doneCount = checks.filter((x) => x.done).length;
  const rows = [...checks.filter((x) => !x.done), ...checks.filter((x) => x.done)].slice(0, 4);

  const totalViews = report?.views ?? 0;
  const countryRows = report?.countries.slice(0, 4).map((c) => ({ name: regions.of(c.key) ?? c.key, share: totalViews ? Math.round((c.count / totalViews) * 100) : 0 })) ?? [];
  const otherShare = Math.max(0, 100 - countryRows.reduce((a, c) => a + c.share, 0));
  if (countryRows.length && otherShare > 0 && (report?.countries.length ?? 0) > 4) countryRows.push({ name: t("others"), share: otherShare });

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <PageHeader
        title={t("hello", { name: firstName })}
        subtitle={t("summary")}
        leading={page.photoUrl ? <Image src={page.photoUrl} alt="" width={48} height={48} unoptimized className="size-11 shrink-0 rounded-full object-cover md:size-12" /> : undefined}
        actions={<ShareButton url={pageUrl} />}
      />

      {page.deletedAt && (
        <Link href="/dashboard/subscription" className="rounded-card border border-bad/20 bg-bad/8 px-4 py-3 text-sm text-bad underline">{t("deletionScheduled")}</Link>
      )}

      <LinkCard
        username={page.username} url={pageUrl} published={page.isPublished}
        pdfLangs={pdfLangs} pdfNote={page.isPublished ? t("pdfPro") : t("pdfPublishFirst")}
        templateName={tpl(page.template)} languages={languages}
      />

      {urgentPlan && plan}
      {nudge}

      {report && prev ? (
        <KpiStrip
          items={[
            { label: t("stat.views"), icon: <Eye aria-hidden="true" size={14} />, value: formatNumber(report.views, lang), ...delta(report.views, prev.views), spark: spark("views") },
            { label: t("stat.whatsapp"), icon: <MessageCircle aria-hidden="true" size={14} />, value: formatNumber(report.whatsapp, lang), ...delta(report.whatsapp, prev.whatsapp), spark: spark("whatsapp") },
            { label: t("stat.email"), icon: <Mail aria-hidden="true" size={14} />, value: formatNumber(report.email, lang), ...delta(report.email, prev.email), spark: spark("email") },
            {
              label: t("stat.countries"), icon: <Globe aria-hidden="true" size={14} />, value: formatNumber(report.countries.length, lang),
              note: topCountry ? `${regions.of(topCountry.key) ?? topCountry.key} ${formatPercent(countryShare, lang)}` : t("noChange"),
            },
          ]}
        />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-3 text-sm text-muted"><Lock aria-hidden="true" size={18} /> {t("statsPro")}</span>
          <Link href="/dashboard/subscription" className={buttonClasses("primary")}>{t("upgrade")}</Link>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        {report && (
          <Panel
            title={t("visits")}
            aside={
              <span className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-3.5 rounded bg-blue" />{t("last30")}</span>
                <span className="hidden items-center gap-1.5 sm:inline-flex"><span aria-hidden="true" className="h-0.5 w-3.5 bg-[repeating-linear-gradient(90deg,var(--color-faint)_0_4px,transparent_4px_7px)]" />{t("previousPeriod")}</span>
              </span>
            }
          >
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span dir="ltr" className="font-numbers text-[28px] leading-none tabular-nums">{formatNumber(report.views, lang)}</span>
              {prev && prev.views > 0 && <Pill tone={report.views >= prev.views ? "good" : "warn"} dot={false}><bdi dir="ltr">{change(report.views, prev.views)}</bdi></Pill>}
            </div>
            <AreaChart points={points} ticks={ticks} ariaLabel={t("visitsChart30", { total: formatNumber(report.views, lang) })} />
          </Panel>
        )}

        <Panel title={t("completion")} aside={t("stepsDone", { done: doneCount, total: checks.length })} className={report ? "" : "lg:col-span-2"}>
          <div className="mb-3 flex items-center gap-4">
            <div
              role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t("completion")}
              className="grid size-[76px] shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(var(--color-blue) ${percent}%, var(--color-line-soft) 0)` }}
            >
              <span className="col-start-1 row-start-1 size-[62px] rounded-full bg-card" />
              <span dir="ltr" className="col-start-1 row-start-1 font-numbers text-[17px]">{formatPercent(percent, lang)}</span>
            </div>
            <p className="text-[13px] text-muted">{todos.length ? t("completionHint", { left: checks.length - doneCount }) : t("complete")}</p>
          </div>
          <ul className="flex flex-col divide-y divide-line-soft">
            {rows.map((td) => (
              <li key={td.text}>
                <Link href={td.href} className={`flex min-h-11 items-center gap-3 text-[13.5px] ${td.done ? "text-muted line-through decoration-faint" : ""}`}>
                  {td.done
                    ? <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-good text-white"><Check aria-hidden="true" size={12} strokeWidth={3} /></span>
                    : <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full border-[1.5px] border-dashed border-faint" />}
                  <span className="flex-1">{td.text}</span>
                  <Chevron aria-hidden="true" size={16} className="text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {accounts.length > 0 && (
          <Panel
            title={t("verification")} flush
            aside={<Link href="/dashboard/verification" className="inline-flex min-h-11 items-center gap-0.5 font-semibold text-blue md:min-h-0">{t("verifiedOf", { done: verifiedCount, total: accounts.length })}<Chevron aria-hidden="true" size={14} /></Link>}
          >
            <ul className="flex flex-col divide-y divide-line-soft">
              {verify.map(({ a, status }) => (
                <li key={a.id} className="flex min-h-[52px] items-center gap-3 px-5 py-1.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-hover"><PlatformIcon platform={a.platform} size={16} /></span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="text-[13.5px] font-medium">{PLATFORM_NAMES[a.platform]}</span>
                    <span dir="ltr" className="truncate text-[11.5px] text-muted rtl:text-end">@{a.handle}</span>
                  </span>
                  {a.followers != null && <span dir="ltr" className="hidden text-[13px] font-semibold tabular-nums sm:inline">{compact.format(Number(a.followers))}</span>}
                  {status === "none" ? (
                    <Link href="/dashboard/verification" className="inline-flex min-h-11 items-center text-[12.5px] font-bold text-blue">{t("verifyNow")}</Link>
                  ) : (
                    <Pill tone={STATUS_TONE[status]}>{t(`vstatus.${status}`)}</Pill>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {report && (
          <Panel title={t("topCountries")} aside={t("last30")}>
            {countryRows.length ? (
              <ul className="flex flex-col gap-3.5">
                {countryRows.map((c) => (
                  <li key={c.name} className="flex flex-col gap-1.5">
                    <span className="flex justify-between text-[13px]"><span>{c.name}</span><b dir="ltr" className="font-semibold tabular-nums">{formatPercent(c.share, lang)}</b></span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-line-soft"><span className="block h-full rounded-full bg-blue" style={{ width: `${c.share}%` }} /></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-muted">{t("noVisits")}</p>}
          </Panel>
        )}

        {!urgentPlan && plan}
      </div>
    </div>
  );
}

const STATUS_TONE = { verified: "good", expiring: "warn", in_review: "blue", rejected: "bad", expired: "bad", none: "grey" } as const;
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** "+12%" / "−3%" (left-to-right) for the change between two periods. */
function change(cur: number, before: number) {
  const pct = Math.round(((cur - before) / before) * 100);
  return `${pct > 0 ? "↑ +" : pct < 0 ? "↓ −" : ""}${Math.abs(pct)}%`;
}

function UpdateNudge({ t, month, last }: { t: Awaited<ReturnType<typeof getTranslations<"Home">>>; month: string; last: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-warn/25 bg-warn/8 px-4 py-3">
      <CalendarClock aria-hidden="true" size={18} className="shrink-0 text-warn" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13.5px] font-bold">{t("updateNumbers", { month })}</span>
        <span className="text-[12.5px] text-muted">{last ? t("lastUpdated", { month: last }) : t("neverUpdated")}</span>
      </span>
      <Link href="/dashboard/accounts" className={buttonClasses("secondary")}>{t("update")}</Link>
    </div>
  );
}

type Sub = Awaited<ReturnType<typeof db.subscription.findUnique>>;

/** Subscription panel: trial (days left), last trial days (what the page achieved), Free, or the paid plan. */
async function PlanPanel({ lang, sub, pro, pageId }: { lang: Locale; sub: Sub; pro: boolean; pageId: string }) {
  const t = await getTranslations("Home");
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long" });
  const currency = sub?.currency ?? (lang === "en" ? "USD" : "SAR");
  const monthly = PRICES[currency].monthly;
  const priceText = t("perMonth", { price: formatNumber(monthly, lang), currency });
  const badge = pro
    ? <Pill tone="blue" dot={false}><Sparkles aria-hidden="true" size={12} />{t("proBadge")}</Pill>
    : <Pill tone="grey" dot={false}>{t("freeBadge")}</Pill>;
  const panel = (children: React.ReactNode) => (
    <Panel title={t("subscription")} aside={badge} bodyClassName="flex flex-col gap-3">{children}</Panel>
  );
  const cta = (text: string) => <Link href="/dashboard/subscription" className={buttonClasses("primary", "mt-auto w-full")}>{text}</Link>;

  if (sub?.status === "trialing" && pro) {
    const left = trialDaysLeft(sub.trialEndsAt);
    const meter = (
      <>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-muted">{t("trial")}</span>
          <b className={left <= 1 ? "text-bad" : left <= 4 ? "text-warn" : ""}>{t("daysLeftShort", { days: left })}</b>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuenow={left} aria-valuemin={0} aria-valuemax={TRIAL_DAYS} aria-label={t("trial")}>
          <div className={`h-full rounded-full ${left <= 4 ? "bg-warn" : "brand-gradient"}`} style={{ width: `${Math.round((left / TRIAL_DAYS) * 100)}%` }} />
        </div>
      </>
    );
    // Last days: show what the page achieved during the trial.
    if (left <= 4) {
      const since = new Date(today().getTime() - 14 * DAY);
      const [views, clicks] = await Promise.all([
        db.pageView.count({ where: { pageId, day: { gte: since } } }),
        db.contactClick.count({ where: { pageId, day: { gte: since }, kind: { in: ["whatsapp", "email"] } } }),
      ]);
      const urgent = left <= 1;
      return panel(
        <>
          {meter}
          <p className="text-[13px] text-muted">{urgent ? t("trialKeep") : t("trialAchieved")}</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: views, l: t("visitsUnit") }, { v: clicks, l: t("contactsUnit") }].map((x) => (
              <span key={x.l} className="flex flex-col items-center rounded-xl border border-line-soft bg-bg py-2">
                <span dir="ltr" className="font-numbers text-lg">{formatNumber(x.v, lang)}</span>
                <span className="text-xs text-muted">{x.l}</span>
              </span>
            ))}
          </div>
          {cta(urgent ? t("subscribeNow") : t("continueFor", { price: priceText }))}
        </>,
      );
    }
    return panel(
      <>
        {meter}
        <p className="text-[13px] text-muted">{t("trialAfter")}</p>
        {cta(t("continueFor", { price: priceText }))}
      </>,
    );
  }

  if (!pro) {
    return panel(
      <>
        <p className="text-[13.5px] font-bold">{t("onFree")}</p>
        <p className="text-[13px] text-muted">{t("dataSafe")}</p>
        {cta(t("bringBack"))}
      </>,
    );
  }

  const cycle = sub?.cycle ?? "monthly";
  const price = formatNumber(PRICES[currency][cycle], lang);
  return panel(
    <>
      <p className="text-[13.5px] font-bold">{t("paidPlan")}</p>
      {sub?.currentPeriodEnd && (
        <p className="text-[13px] text-muted">{t(sub.cancelAtPeriodEnd ? "endsOn" : "renewsOn", { date: date.format(sub.currentPeriodEnd), price, currency, cycle })}</p>
      )}
      <Link href="/dashboard/subscription" className={buttonClasses("secondary", "mt-auto w-full")}>{t("manage")}</Link>
    </>,
  );
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));

  return (
    <Suspense fallback={<SectionSkeleton />}>
      <Home lang={locale} />
    </Suspense>
  );
}
