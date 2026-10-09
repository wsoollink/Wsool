import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, ChevronLeft, ChevronRight, Circle, CreditCard, Gift, Lock, Sparkles, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Card } from "@/components/ui/Card";
import { FREE_LIMITS, PRICES, hasPro, trialDaysLeft } from "@/config/plans";
import { PLATFORM_NAMES } from "@/config/platforms";
import { verificationDisplay } from "@/config/verification";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { today } from "@/lib/analytics";
import { analyticsReport, periodTotals } from "@/lib/analytics-report";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/format";
import { pageLanguages } from "@/lib/page-language";
import { siteOrigin } from "@/lib/site-url";
import { LinkCard } from "./LinkCard";

const DAY = 86_400_000;
const sectionTitle = "flex items-baseline justify-between gap-3";

/** Dashboard home from the design: link card, plan/trial, 30-day stats, visits, completion, verification. */
async function Home({ lang }: { lang: Locale }) {
  const { user, page } = await requireCreator();
  const t = await getTranslations("Home");
  const tpl = await getTranslations("AppearancePage.templates");
  const locale = toIntlLocale(lang);
  const now = new Date();

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
  const longDate = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const c = counts?._count;

  // Stats: last 30 days vs the 30 before (analytics is a Pro feature).
  const canStats = pro || FREE_LIMITS.analytics;
  const end = today();
  const report = canStats ? await analyticsReport(page.id, 30) : null;
  const prev = canStats ? await periodTotals(page.id, new Date(end.getTime() - 59 * DAY), new Date(end.getTime() - 30 * DAY)) : null;
  const delta = (cur: number, before: number) => {
    if (!before) return { text: cur ? t("new") : t("noChange"), tone: "text-muted" };
    const pct = Math.round(((cur - before) / before) * 100);
    // Isolated left-to-right so "+12%" keeps its sign in front in Arabic.
    const change = `\u2066${pct > 0 ? "+" : pct < 0 ? "−" : ""}${formatPercent(Math.abs(pct), lang)}\u2069`;
    return { text: t("vsLastMonth", { change }), tone: pct >= 0 ? "text-good" : "text-warn" };
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
  const series = report?.series.slice(-14) ?? [];
  const maxBar = Math.max(1, ...series.map((d) => d.views));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("hello", { name: firstName })}
        section="home"
        leading={page.photoUrl ? <Image src={page.photoUrl} alt="" width={48} height={48} unoptimized className="size-11 shrink-0 rounded-full object-cover md:size-12" /> : undefined}
      />

      {page.deletedAt && (
        <Link href="/dashboard/subscription" className="rounded-[18px] bg-bad/10 px-4 py-3 text-sm text-bad underline">{t("deletionScheduled")}</Link>
      )}

      <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        <LinkCard
          username={page.username} url={pageUrl} published={page.isPublished}
          pdfLangs={pdfLangs} pdfNote={page.isPublished ? t("pdfPro") : t("pdfPublishFirst")}
          templateName={tpl(page.template)}
        />
        <PlanCard lang={lang} sub={sub} pro={pro} pageId={page.id} />
      </div>

      <section className="flex flex-col gap-3">
        <div className={sectionTitle}>
          <h2 className="font-bold">{t("performance")}</h2>
          <span className="text-[12.5px] text-muted">{t("last30")}</span>
        </div>
        {report && prev ? (
          <div className={`grid grid-cols-2 gap-3 ${stale ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
            {[
              { label: t("stat.views"), value: report.views, d: delta(report.views, prev.views) },
              { label: t("stat.whatsapp"), value: report.whatsapp, d: delta(report.whatsapp, prev.whatsapp) },
              { label: t("stat.email"), value: report.email, d: delta(report.email, prev.email) },
              {
                label: t("stat.countries"), value: report.countries.length,
                d: { text: topCountry ? t("topCountry", { country: regions.of(topCountry.key) ?? topCountry.key, percent: formatPercent(countryShare, lang) }) : t("noChange"), tone: "text-muted" },
              },
            ].map((s) => (
              <Card key={s.label} className="flex flex-col gap-1">
                <span className="text-[13px] text-muted">{s.label}</span>
                <span dir="ltr" className="font-numbers text-[26px] font-black tabular-nums md:text-3xl rtl:text-end">{formatNumber(s.value, lang)}</span>
                <span className={`text-[12.5px] font-medium ${s.d.tone}`}>{s.d.text}</span>
              </Card>
            ))}
            {stale && <UpdateNudge t={t} month={month.format(now)} last={lastNumbers ? month.format(new Date(lastNumbers)) : null} />}
          </div>
        ) : (
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm text-muted"><Lock aria-hidden="true" size={18} /> {t("statsPro")}</span>
            <Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center text-sm font-bold text-blue">{t("upgrade")}</Link>
          </Card>
        )}
        {!report && stale && <UpdateNudge t={t} month={month.format(now)} last={lastNumbers ? month.format(new Date(lastNumbers)) : null} />}
      </section>

      <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(340px,1fr))]">
        {report && (
          <Card className="flex flex-col gap-3">
            <div className={sectionTitle}>
              <h2 className="font-bold">{t("visits")}</h2>
              <span className="text-[12.5px] text-muted">{t("last14")}</span>
            </div>
            <div dir="ltr" role="img" aria-label={t("visitsChart", { total: formatNumber(series.reduce((s, d) => s + d.views, 0), lang) })} className="flex h-40 items-end gap-1.5">
              {series.map((d, i) => (
                <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-medium text-muted">{d.views || ""}</span>
                  <div className="w-full rounded-t-[6px] rounded-b-[3px] bg-blue" style={{ height: `${Math.max(3, Math.round((d.views / maxBar) * 120))}px`, opacity: i === series.length - 1 ? 1 : 0.35 + (i / series.length) * 0.4 }} />
                </div>
              ))}
            </div>
            <div dir="ltr" className="flex justify-between text-xs text-muted">
              <span>{series[0] ? longDate.format(new Date(series[0].day)) : ""}</span>
              <span>{t("today")}</span>
            </div>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{t("completion")}</h2>
            <span dir="ltr" className="font-numbers text-[26px] font-black">{formatPercent(percent, lang)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy/5" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t("completion")}>
            <div className="h-full rounded-full bg-blue" style={{ width: `${percent}%` }} />
          </div>
          {todos.length ? (
            <ul className="flex flex-col">
              {todos.map((td) => (
                <li key={td.text}>
                  <Link href={td.href} className="flex min-h-11 items-center gap-3 text-sm">
                    <Circle aria-hidden="true" size={18} className="shrink-0 text-navy/25" />
                    <span className="flex-1">{td.text}</span>
                    <Chevron aria-hidden="true" size={16} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-good"><Sparkles aria-hidden="true" size={16} /> {t("complete")}</p>
          )}
        </Card>
      </div>

      {accounts.length > 0 && (
        <Card className="flex flex-col gap-1">
          <div className={`${sectionTitle} mb-1`}>
            <h2 className="font-bold">{t("verification")}</h2>
            <span className="text-[12.5px] text-muted">{t("verifiedOf", { done: verifiedCount, total: accounts.length })}</span>
          </div>
          <ul className="flex flex-col divide-y divide-navy/6">
            {verify.map(({ a, status }) => {
              const tone = status === "verified" ? "text-good" : status === "in_review" || status === "expiring" ? "text-warn" : status === "rejected" || status === "expired" ? "text-bad" : "";
              return (
                <li key={a.id} className="flex min-h-12 items-center gap-3 py-1">
                  <PlatformIcon platform={a.platform} size={20} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{PLATFORM_NAMES[a.platform]}</span>
                    <span dir="ltr" className="truncate text-xs text-muted rtl:text-end">@{a.handle}</span>
                  </span>
                  {status === "none" ? (
                    <Link href="/dashboard/verification" className="inline-flex min-h-11 items-center rounded-full px-3 text-[12.5px] font-bold text-blue">{t("verifyNow")}</Link>
                  ) : (
                    <span className={`flex items-center gap-1.5 text-[12.5px] font-medium ${tone}`}>
                      <span aria-hidden="true" className="size-[7px] rounded-full bg-current" />
                      {t(`vstatus.${status}`)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function UpdateNudge({ t, month, last }: { t: Awaited<ReturnType<typeof getTranslations<"Home">>>; month: string; last: string | null }) {
  return (
    <Card className="col-span-2 flex items-center gap-3 lg:col-span-1 lg:flex-col lg:items-start">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-warn/10 text-warn"><CalendarClock aria-hidden="true" size={20} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold">{t("updateNumbers", { month })}</span>
        <span className="text-[12.5px] text-muted">{last ? t("lastUpdated", { month: last }) : t("neverUpdated")}</span>
      </span>
      <Link href="/dashboard/accounts" className="inline-flex h-10 shrink-0 items-center rounded-full bg-navy/5 px-4 text-[13px] font-bold">{t("update")}</Link>
    </Card>
  );
}

type Sub = Awaited<ReturnType<typeof db.subscription.findUnique>>;

/** Plan card, or the trial banner (TrialBanner design) while on trial / after it ended. */
async function PlanCard({ lang, sub, pro, pageId }: { lang: Locale; sub: Sub; pro: boolean; pageId: string }) {
  const t = await getTranslations("Home");
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long" });
  const currency = sub?.currency ?? (lang === "en" ? "USD" : "SAR");
  const monthly = PRICES[currency].monthly;
  const priceText = t("perMonth", { price: formatNumber(monthly, lang), currency });
  const cta = "inline-flex h-11 items-center justify-center rounded-full bg-blue px-5 text-sm font-bold text-white";

  if (sub?.status === "trialing" && pro) {
    const left = trialDaysLeft(sub.trialEndsAt);
    // Last days: show what the page achieved during the trial.
    if (left <= 4) {
      const since = new Date(today().getTime() - 14 * DAY);
      const [views, clicks] = await Promise.all([
        db.pageView.count({ where: { pageId, day: { gte: since } } }),
        db.contactClick.count({ where: { pageId, day: { gte: since }, kind: { in: ["whatsapp", "email"] } } }),
      ]);
      const urgent = left <= 1;
      return (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-bad/8 text-bad" : "bg-warn/10 text-warn"}`}><TriangleAlert aria-hidden="true" size={20} /></span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-bold">{urgent ? t("trialTomorrow") : t("trialDaysLeft", { days: left })}</span>
              <span className="text-[12.5px] text-muted">{urgent ? t("trialKeep") : t("trialAchieved")}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: views, l: t("visitsUnit") }, { v: clicks, l: t("contactsUnit") }].map((x) => (
              <span key={x.l} className="flex flex-col items-center rounded-xl bg-navy/5 py-2">
                <span dir="ltr" className="font-numbers text-lg font-black">{formatNumber(x.v, lang)}</span>
                <span className="text-xs text-muted">{x.l}</span>
              </span>
            ))}
          </div>
          <Link href="/dashboard/subscription" className={cta}>{urgent ? t("subscribeNow") : t("continueFor", { price: priceText })}</Link>
        </Card>
      );
    }
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-good/10 text-good"><Gift aria-hidden="true" size={20} /></span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[14.5px] font-bold">{t("onTrial")}</span>
            <span className="text-[12.5px] text-muted">{t("trialLeft", { days: left })}</span>
          </span>
        </div>
        <Link href="/dashboard/subscription" className={cta}>{t("subscribeNow")}</Link>
      </Card>
    );
  }

  if (!pro) {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy/6 text-navy"><CreditCard aria-hidden="true" size={20} /></span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[14.5px] font-bold">{t("onFree")}</span>
            <span className="text-[12.5px] text-muted">{t("dataSafe")}</span>
          </span>
        </div>
        <Link href="/dashboard/subscription" className={cta}>{t("bringBack")}</Link>
      </Card>
    );
  }

  const cycle = sub?.cycle ?? "monthly";
  const price = formatNumber(PRICES[currency][cycle], lang);
  return (
    <Card className="flex items-center gap-3">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5"><CreditCard aria-hidden="true" size={20} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold">{t("paidPlan")}</span>
        <span className="text-[12.5px] text-muted">
          {sub?.currentPeriodEnd
            ? t(sub.cancelAtPeriodEnd ? "endsOn" : "renewsOn", { date: date.format(sub.currentPeriodEnd), price, currency, cycle })
            : t("paidPlan")}
        </span>
      </span>
      <Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center text-[13px] font-bold text-blue">{t("manage")}</Link>
    </Card>
  );
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));

  return (
    <Suspense fallback={null}>
      <Home lang={locale} />
    </Suspense>
  );
}
