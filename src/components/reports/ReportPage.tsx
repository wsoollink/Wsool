import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, CalendarDays, ExternalLink } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { AreaChart } from "@/components/charts/AreaChart";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { PrintButton } from "@/components/PrintButton";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { toIntlLocale } from "@/i18n/config";
import { POST_METRICS, type PostMetric, type PostMetrics } from "@/lib/connect/types";

export type ReportData = {
  brand: string;
  lang: "ar" | "en";
  /** Who made it: the creator, or the agency (agency reports list several creators). */
  by: { name: string; photo: string | null; href: string | null; agency: boolean };
  posts: { platform: Platform; url: string; title: string | null; thumb: string | null; postedAt: Date | null; handle: string; creator: string | null; metrics: PostMetrics; lastSync: Date | null }[];
  totals: PostMetrics;
  chart: { day: string; views: number }[];
  updatedAt: Date | null;
  demo?: boolean;
};

/** Metrics in the order the report shows them; avgViewSeconds is shown per post only. */
const TOTAL_KEYS: PostMetric[] = ["views", "reach", "likes", "comments", "shares", "saves", "watchMinutes"];

/**
 * The shared ad report (wsool.link/r/<token>): brand, who made it, totals, engagement rate, views per day, then each post
 * with its own numbers. Numbers come from the platforms through the creators' linked accounts; "Print / PDF" saves it.
 */
export async function ReportPage({ data }: { data: ReportData }) {
  const t = await getTranslations({ locale: toIntlLocale(data.lang), namespace: "AdReport" });
  const intl = toIntlLocale(data.lang);
  const num = (n: number) => new Intl.NumberFormat(intl, { notation: n >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
  const date = new Intl.DateTimeFormat(intl, { dateStyle: "medium" });
  const dateTime = new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" });
  // "1 Nov" style under the chart: no slashes, which right-to-left text scrambles.
  const dayMonth = new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", timeZone: "UTC" });
  const shown = TOTAL_KEYS.filter((k) => typeof data.totals[k] === "number");
  const v = data.totals.views ?? 0;
  const interactions = (data.totals.likes ?? 0) + (data.totals.comments ?? 0) + (data.totals.shares ?? 0) + (data.totals.saves ?? 0);
  const rate = v > 0 ? (interactions / v) * 100 : null;
  const first = data.posts.map((p) => p.postedAt).filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0];
  const platforms = [...new Set(data.posts.map((p) => p.platform))];
  const chartPoints = data.chart.map((c) => ({ label: c.day, value: c.views, text: `${dayMonth.format(new Date(c.day))}: ${num(c.views)}` }));

  return (
    <div lang={data.lang} dir={data.lang === "ar" ? "rtl" : "ltr"} className="flex flex-1 flex-col bg-bg-marketing">
      {data.demo && (
        <div className="bg-navy px-4 py-2 text-center text-sm font-bold text-white print:hidden">
          {t("demoBar")} <Link href="/login" className="underline underline-offset-2">{t("demoCta")}</Link>
        </div>
      )}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <header className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <BrandLogo lang={data.lang} alt={data.lang === "en" ? "Wsool" : "وصول"} />
            <PrintButton label={t("print")} />
          </div>
          <div className="ac-hero flex flex-col gap-4 rounded-[22px] p-6 text-white md:p-10">
            <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{t("kicker")}</span>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">{t("title", { brand: data.brand })}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
              <span className="flex items-center gap-2">
                {data.by.photo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={data.by.photo} alt="" className={`size-9 object-cover ${data.by.agency ? "rounded-lg bg-white p-1 object-contain" : "rounded-full"}`} />
                  : null}
                <span>{data.by.agency ? t("byAgency") : t("byCreator")}{" "}
                  {data.by.href ? <a href={data.by.href} className="font-bold text-white underline-offset-2 hover:underline">{data.by.name}</a> : <b className="text-white">{data.by.name}</b>}
                </span>
              </span>
              {first && <span className="flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={15} /> {t("since", { date: date.format(first) })}</span>}
              <span className="flex items-center gap-1">{platforms.map((p) => <PlatformIcon key={p} platform={p} size={16} />)}</span>
            </div>
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <BadgeCheck aria-hidden="true" size={18} className="text-[#7DD3FC]" />
              {t("fromPlatforms")}{data.updatedAt ? ` · ${t("updated", { date: dateTime.format(data.updatedAt) })}` : ""}
            </p>
          </div>
        </header>

        <section aria-label={t("totals")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((k) => (
            <div key={k} className="rounded-card border border-line bg-card p-4 shadow-card">
              <p className="text-xs font-bold text-muted">{t(`m.${k}`)}</p>
              <p className="mt-1 font-numbers text-2xl font-black md:text-3xl">{num(data.totals[k]!)}</p>
            </div>
          ))}
          {rate !== null && (
            <div className="rounded-card border border-blue/30 bg-blue/5 p-4 shadow-card">
              <p className="text-xs font-bold text-blue">{t("engagement")}</p>
              <p className="mt-1 font-numbers text-2xl font-black text-blue md:text-3xl">{rate.toFixed(rate < 10 ? 1 : 0)}%</p>
            </div>
          )}
        </section>

        {chartPoints.length > 1 && (
          <section className="rounded-card border border-line bg-card p-4 shadow-card md:p-6">
            <h2 className="mb-3 font-black">{t("viewsOverTime")}</h2>
            <AreaChart points={chartPoints} ariaLabel={t("viewsOverTime")} ticks={[dayMonth.format(new Date(chartPoints[0].label)), dayMonth.format(new Date(chartPoints.at(-1)!.label))]} />
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-black">{t("posts", { n: data.posts.length })}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.posts.map((p, i) => (
              <article key={i} className="flex flex-col overflow-hidden rounded-card border border-line bg-card shadow-card print:break-inside-avoid">
                <div className="flex gap-3 p-4">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-navy/5" aria-label={t("openPost")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.thumb && <img src={p.thumb} alt="" className="size-full object-cover" loading="lazy" />}
                  </a>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-muted"><PlatformIcon platform={p.platform} size={14} /> {PLATFORM_NAMES[p.platform]} · <bdi dir="ltr">@{p.handle}</bdi></p>
                    {p.creator && <p className="text-xs text-muted">{p.creator}</p>}
                    <p className="line-clamp-2 text-sm font-bold" dir="auto">{p.title || t("untitled")}</p>
                    {p.postedAt && <p className="text-xs text-muted">{t("postedOn", { date: date.format(p.postedAt) })}</p>}
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-px border-t border-line bg-line">
                  {POST_METRICS.filter((k) => typeof p.metrics[k] === "number").map((k) => (
                    <div key={k} className="bg-card px-3 py-2.5">
                      <dt className="text-[11px] text-muted">{t(`m.${k}`)}</dt>
                      <dd className="font-numbers text-base font-black">{k === "avgViewSeconds" ? t("seconds", { n: p.metrics[k]! }) : num(p.metrics[k]!)}</dd>
                    </div>
                  ))}
                </dl>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 border-t border-line text-sm font-bold text-blue print:hidden">
                  {t("openOn", { platform: PLATFORM_NAMES[p.platform] })} <ExternalLink aria-hidden="true" size={14} />
                </a>
              </article>
            ))}
          </div>
        </section>

        <p className="text-xs leading-6 text-muted">{t("note")}</p>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm text-muted">
          <span>{t("madeWith")} <Link href="/" className="font-bold text-blue">{data.lang === "en" ? "Wsool" : "وصول"}</Link></span>
          <Link href="/" className="font-bold text-blue print:hidden">{t("makeYours")}</Link>
        </footer>
      </main>
    </div>
  );
}
