import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Megaphone, ShieldCheck, Sparkles, X } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import type { Platform } from "@/generated/prisma/enums";
import { isLocale, toIntlLocale } from "@/i18n/config";
import {
  ActivityLog, DashboardMock, FloatInvite, FloatPdf, FloatWeek, LinkedRows, PdfStack, PermissionsMock, TeamRoles, VisitsBars,
} from "./Visuals";
import { AgenciesFooter, AgenciesHeader, APPLY } from "./Header";
import { AgencyPlans, type AgencyPlan } from "./Plans";
import { AgenciesNewsletter } from "./Newsletter";

type Item = { t: string; b: string };
type Plan = AgencyPlan;
type Faq = { q: string; a: string };

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Agencies" });
  return { title: t("metaTitle"), description: t("metaDesc") };
}

const TRIAL = APPLY;
const STRIP: Platform[] = ["instagram", "tiktok", "youtube", "snapchat", "x", "threads", "facebook", "telegram"];
const STRIP_NAMES: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", snapchat: "Snapchat", x: "X", threads: "Threads", facebook: "Facebook", telegram: "Telegram", twitch: "Twitch" };

/** Small blue label above a section title, like the home page ("— المزايا"). */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-blue"><span className="h-0.5 w-4 rounded bg-blue" />{children}</p>;
}

/** Two-tone section title: navy, then blue gradient. */
function Title({ a, b }: { a: string; b?: string }) {
  return (
    <h2 className="text-center text-3xl leading-tight font-black md:text-5xl md:leading-tight">
      {a}
      {b && <><br /><span className="bg-gradient-to-l from-[#0060E6] to-[#22B8F0] bg-clip-text text-transparent">{b}</span></>}
    </h2>
  );
}

const card = "rounded-[24px] border border-line bg-card p-6 md:p-7";
const primaryCta = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#021941] px-7 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(2,25,65,0.6)] transition hover:bg-[#0A2A5E] dark:bg-[#7DD3FC] dark:text-[#021941] dark:hover:bg-[#A5E1FD]";

/** "For agencies" landing page (owner, Nov 2026). Same visual language as the home page (grid, two-tone titles, bento). */
export default async function AgenciesPage({ params }: PageProps<"/[locale]/agencies">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Agencies");
  const lang = locale === "en" ? "en" : "ar";
  const en = lang === "en";
  const Arrow = en ? ArrowRight : ArrowLeft;
  const raw = <T,>(k: string) => t.raw(k) as T;
  const how = raw<Item[]>("how");
  const soon = raw<Item[]>("soon");
  const plans = raw<Plan[]>("plans");
  const faq = raw<Faq[]>("faq");

  return (
    <div className="ag-grid flex flex-1 flex-col bg-bg-marketing">
      <AgenciesHeader lang={lang} />

      <main className="flex-1 overflow-x-clip">
        {/* Hero */}
        <section className="relative">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 start-1/2 size-[640px] rounded-full ag-glow [--glow:#22B8F036]" />
          <div className="relative mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-4 pt-12 pb-16 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card py-1 ps-1 pe-3 text-[13px] font-semibold shadow-card">
                <span className="rounded-full bg-blue px-2.5 py-0.5 text-xs font-bold text-on-blue">{t("chipNew")}</span>
                {t("chip")}
              </span>
              <h1 className="text-[42px] leading-[1.15] font-black md:text-[68px] md:leading-[1.08]">
                {t("heroA")}
                <br />
                <span className="bg-gradient-to-l from-[#0060E6] to-[#22B8F0] bg-clip-text text-transparent">{t("heroB")}</span>
              </h1>
              <p className="max-w-xl text-lg leading-9 text-muted">{t("heroBody")}</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href={TRIAL} className={primaryCta}>{t("ctaTrial")}</Link>
                <Link href="/agencies/demo" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-blue">
                  {t("ctaAgencyDemo")} <Arrow aria-hidden="true" size={17} />
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                {raw<string[]>("heroChecks").map((c) => <li key={c} className="flex items-center gap-1.5"><Check aria-hidden="true" size={16} className="text-good" />{c}</li>)}
              </ul>
            </div>

            <div className="relative" aria-hidden="true">
              <div aria-hidden="true" className="absolute inset-x-10 -bottom-6 h-24 rounded-full ag-glow [--glow:#0060E659]" />
              <div className="relative"><DashboardMock t={raw("dash")} lang={lang} /></div>
              <div className="ag-float absolute -top-14 start-8 hidden sm:block"><FloatInvite text={t("float.invite")} /></div>
              <div className="ag-float-2 absolute -bottom-14 end-6 hidden sm:block"><FloatWeek text={t("float.week")} /></div>
              <div className="ag-float absolute top-[38%] -end-16 hidden xl:block"><FloatPdf text={t("float.pdf")} /></div>
            </div>
          </div>
        </section>

        {/* Platforms strip: a slow endless scroll (two copies of the list), like the home page */}
        <section className="border-y border-line bg-card/60">
          <div className="mx-auto flex max-w-[1180px] items-center gap-6 px-4 py-6">
            <p className="hidden shrink-0 text-sm font-semibold text-muted sm:block">{t("stripTitle")}</p>
            <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div className="ag-marq flex w-max">
                {[0, 1].map((copy) => (
                  <div key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 items-center gap-10 pe-10">
                    {STRIP.map((p) => (
                      <span key={p} className="flex items-center gap-2 text-[15px] font-bold whitespace-nowrap text-muted" dir="ltr">
                        <PlatformIcon platform={p} size={18} /> {STRIP_NAMES[p]}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bento features */}
        <section id="features" className="mx-auto max-w-[1180px] scroll-mt-24 px-4 py-20 md:py-28">
          <Eyebrow>{t("featEyebrow")}</Eyebrow>
          <Title a={t("featTitleA")} b={t("featTitleB")} />
          <p className="mx-auto mt-4 mb-12 max-w-2xl text-center text-lg text-muted">{t("featBody")}</p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
            <div className={`${card} lg:col-span-4`}>
              <h3 className="mb-2 text-2xl font-black">{t("f1t")}</h3>
              <p className="mb-6 max-w-lg leading-7 text-muted">{t("f1b")}</p>
              <div className="rounded-2xl border border-line bg-bg-marketing p-3"><DashboardMock t={raw("dash")} lang={lang} /></div>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className={`${card} flex-1`}>
                <h3 className="mb-2 text-xl font-black">{t("f2t")}</h3>
                <p className="mb-5 text-sm leading-7 text-muted">{t("f2b")}</p>
                <LinkedRows linked={t("dash.linked")} updated={t("dash.updated")} />
              </div>
              <div className={`${card} flex-1`}>
                <h3 className="mb-2 text-xl font-black">{t("f3t")}</h3>
                <p className="mb-5 text-sm leading-7 text-muted">{t("f3b")}</p>
                <TeamRoles roles={raw("roles")} lang={lang} />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0A2A5E] via-[#021941] to-[#021941] p-6 text-white md:p-7 lg:col-span-3">
              <div aria-hidden="true" className="absolute -top-20 -end-16 size-72 rounded-full ag-glow [--glow:#22B8F059]" />
              <h3 className="relative mb-2 text-2xl font-black">{t("f4t")}</h3>
              <p className="relative mb-8 leading-7 opacity-80">{t("f4b")}</p>
              <PdfStack lang={lang} />
            </div>
            <div className={`${card} lg:col-span-3`}>
              <h3 className="mb-2 text-2xl font-black">{t("f5t")}</h3>
              <p className="mb-6 leading-7 text-muted">{t("f5b")}</p>
              <VisitsBars lang={lang} />
            </div>
            <div className={`${card} lg:col-span-6 lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-10`}>
              <div>
                <h3 className="mb-2 text-2xl font-black">{t("f6t")}</h3>
                <p className="mb-6 leading-7 text-muted lg:mb-0">{t("f6b")}</p>
              </div>
              <div className="rounded-2xl border border-line bg-bg-marketing p-4"><ActivityLog rows={raw("log")} lang={lang} /></div>
            </div>
          </div>
        </section>

        {/* Before / after */}
        <section className="mx-auto max-w-[1180px] px-4 pb-20 md:pb-28">
          <Eyebrow>{t("compareEyebrow")}</Eyebrow>
          <Title a={t("compareTitle")} />
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={`${card} bg-card/60`}>
              <p className="mb-5 text-lg font-black text-muted">{t("oldTitle")}</p>
              <ul className="flex flex-col gap-3">
                {raw<string[]>("old").map((x) => (
                  <li key={x} className="flex items-center gap-3 text-muted"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bad/10 text-bad"><X size={15} /></span>{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[24px] border-2 border-blue/40 bg-card p-6 shadow-[0_30px_60px_-35px_rgba(0,96,230,0.5)] md:p-7">
              <p className="mb-5 flex items-center gap-2 text-lg font-black"><Sparkles aria-hidden="true" size={20} className="text-blue" />{t("newTitle")}</p>
              <ul className="flex flex-col gap-3">
                {raw<string[]>("new").map((x) => (
                  <li key={x} className="flex items-center gap-3 font-semibold"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-good/10 text-good"><Check size={15} /></span>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1180px] scroll-mt-24 px-4 pb-20 md:pb-28">
          <Eyebrow>{t("howEyebrow")}</Eyebrow>
          <Title a={t("howTitle")} />
          <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {how.map((h, i) => (
              <li key={h.t} className={`${card} relative overflow-hidden`}>
                <span aria-hidden="true" className="font-numbers pointer-events-none absolute -top-4 end-3 text-[110px] leading-none font-black text-blue/[0.07]" dir="ltr">0{i + 1}</span>
                <p className="font-numbers relative mb-3 text-sm font-black text-blue" dir="ltr">0{i + 1}</p>
                <h3 className="relative mb-2 text-xl font-black">{h.t}</h3>
                <p className="relative leading-7 text-muted">{h.b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Ownership */}
        <section className="mx-auto max-w-[1180px] px-4 pb-20 md:pb-28">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0A3A8C] via-[#021941] to-[#021941] p-7 text-white md:p-14">
            <div aria-hidden="true" className="absolute -top-32 -start-24 size-96 rounded-full ag-glow [--glow:#22B8F047]" />
            <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#7DD3FC]"><ShieldCheck aria-hidden="true" size={18} />{t("ownEyebrow")}</p>
                <h2 className="mb-4 text-3xl leading-tight font-black md:text-5xl">{t("ownTitle")}</h2>
                <p className="mb-7 text-lg leading-9 opacity-85">{t("ownBody")}</p>
                <ul className="flex flex-col gap-3">
                  {raw<string[]>("ownPoints").map((p) => (
                    <li key={p} className="flex items-center gap-3 font-semibold"><span className="flex size-7 items-center justify-center rounded-full bg-white/10"><Check aria-hidden="true" size={15} className="text-[#7DD3FC]" /></span>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="mx-auto w-full max-w-sm" aria-hidden="true"><PermissionsMock t={raw("perm")} lang={lang} /></div>
            </div>
          </div>
        </section>

        {/* Coming soon */}
        <section className="mx-auto max-w-[1180px] px-4 pb-20 md:pb-28">
          <Eyebrow>{t("soonEyebrow")}</Eyebrow>
          <Title a={t("soonTitle")} />
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {soon.map((s) => (
              <div key={s.t} className="rounded-[24px] border border-dashed border-blue/30 bg-card/60 p-6">
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-3 py-1 text-xs font-bold text-blue"><Megaphone aria-hidden="true" size={13} />{t("soonPill")}</span>
                <h3 className="mb-2 text-lg font-black">{s.t}</h3>
                <p className="text-sm leading-7 text-muted">{s.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-[1180px] scroll-mt-24 px-4 pb-20 md:pb-28">
          <Eyebrow>{t("priceEyebrow")}</Eyebrow>
          <Title a={t("priceTitle")} />
          <p className="mt-4 mb-8 text-center text-muted">{t("priceNote")}</p>
          <AgencyPlans
            plans={plans}
            href={TRIAL}
            texts={{ monthly: t("billMonthly"), yearly: t("billYearly"), yearlyBadge: t("billYearlyBadge"), switchLabel: t("billSwitch"), cta: t("ctaTrial"), ctaBig: t("planCtaBig"), features: raw<string[]>("planFeatures") }}
          />
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto grid max-w-[1180px] scroll-mt-24 grid-cols-1 gap-10 px-4 pb-20 md:pb-28 lg:grid-cols-[1fr_1.6fr]">
          <div className="lg:pt-2">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-blue"><span className="h-0.5 w-4 rounded bg-blue" />{t("faqEyebrow")}</p>
            <h2 className="text-3xl leading-tight font-black md:text-5xl">{t("faqTitle")}</h2>
          </div>
          <div className="flex flex-col gap-3">
            {faq.map((f, i) => (
              <details key={f.q} open={i === 0} className="group rounded-2xl border border-line bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-bold">
                  {f.q}
                  <ChevronDown aria-hidden="true" size={20} className="shrink-0 text-blue transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 leading-8 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className="mx-auto max-w-[1180px] px-4 pb-20">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0060E6] via-[#0A3A8C] to-[#021941] px-6 py-16 text-center text-white md:py-20">
            <div aria-hidden="true" className="absolute -bottom-32 start-1/2 size-[520px] -translate-x-1/2 rounded-full ag-glow [--glow:#22B8F06B]" />
            <h2 className="relative mx-auto mb-4 max-w-2xl text-3xl leading-tight font-black md:text-6xl">{t("finalTitle")}</h2>
            <p className="relative mx-auto mb-8 max-w-3xl text-lg text-balance opacity-85">{t("finalBody")}</p>
            <Link href={TRIAL} className="relative inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 text-[15px] font-bold text-[#021941] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.5)] hover:bg-white/90">{t("ctaTrial")}</Link>
          </div>
        </section>

        <AgenciesNewsletter lang={lang} />
      </main>

      <AgenciesFooter lang={lang} />
    </div>
  );
}
