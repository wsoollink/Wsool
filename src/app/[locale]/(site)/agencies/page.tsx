import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, BarChart3, Building2, Check, ClipboardList, FileText, Layers, LayoutDashboard, Link2, ShieldCheck, Sparkles, Tags, Users } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerifiedBadge } from "@/components/creator/VerifiedBadge";
import { buttonClasses } from "@/components/ui/Button";
import { isLocale, toIntlLocale } from "@/i18n/config";

type Item = { t: string; b: string };
type Plan = { name: string; creators: string; price: string; per: string; popular?: string };
type Faq = { q: string; a: string };

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Agencies" });
  return { title: t("metaTitle"), description: t("metaDesc") };
}

const TRIAL = "/contact?topic=partnership";
const WHY_ICONS = [LayoutDashboard, BadgeCheck, FileText];
const FEATURE_ICONS = [Users, ShieldCheck, Sparkles, ClipboardList, BarChart3, Tags];
const SOON_ICONS = [Building2, Layers, BarChart3];

/** Sample rows for the dashboard mock in the hero (fictional creators). */
const MOCK = [
  { name: { ar: "عبدالله بن سلطان", en: "Abdullah bin Sultan" }, handle: "demo", followers: "2.4M", hue: "#0A6CFF" },
  { name: { ar: "سارة العتيبي", en: "Sara Alotaibi" }, handle: "sara.style", followers: "860K", hue: "#E1306C" },
  { name: { ar: "فهد القحطاني", en: "Fahad Alqahtani" }, handle: "fahad.tech", followers: "415K", hue: "#12805C" },
  { name: { ar: "نورة الشمري", en: "Noura Alshammari" }, handle: "noura.food", followers: "1.1M", hue: "#B45309" },
];

/** "For agencies" landing page (owner, Nov 2026): what the agency plan will offer, with a trial request. */
export default async function AgenciesPage({ params }: PageProps<"/[locale]/agencies">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Agencies");
  const en = locale === "en";
  const why = t.raw("why") as Item[];
  const how = t.raw("how") as Item[];
  const features = t.raw("features") as Item[];
  const soon = t.raw("soon") as Item[];
  const plans = t.raw("plans") as Plan[];
  const faq = t.raw("faq") as Faq[];
  const points = t.raw("ownPoints") as string[];

  return (
    <div className="flex flex-1 flex-col bg-bg-marketing">
      <header className="sticky top-0 z-20 border-b border-line bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-h-11 items-center" aria-label={t("nav.home")}>
            <BrandLogo lang={en ? "en" : "ar"} alt={en ? "Wsool" : "وصول"} priority />
          </Link>
          <nav aria-label={t("nav.home")} className="hidden items-center gap-1 md:flex">
            <Link href="/" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-hover">{t("nav.creators")}</Link>
            <a href="#pricing" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-hover">{t("nav.pricing")}</a>
            <Link href="/contact" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-hover">{t("nav.contact")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href={TRIAL} className={buttonClasses("primary")}>{t("ctaTrial")}</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue/10 px-3 py-1 text-xs font-bold text-blue">
              <Building2 aria-hidden="true" size={14} /> {t("badge")}
            </span>
            <h1 className="text-3xl leading-tight font-black whitespace-pre-line md:text-5xl md:leading-tight">{t("heroTitle")}</h1>
            <p className="max-w-xl text-base leading-8 text-muted md:text-lg">{t("heroBody")}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={TRIAL} className={buttonClasses("primary", "px-6")}>{t("ctaTrial")}</Link>
              <Link href="/demo" className={buttonClasses("secondary", "px-6")}>{t("ctaDemo")}</Link>
            </div>
          </div>

          {/* Dashboard mock */}
          <div aria-hidden="true" className="rounded-[22px] border border-line bg-card p-4 shadow-[0_30px_60px_-30px_rgba(2,25,65,0.35)] md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-bold">{t("mock.title")}</p>
              <span className="rounded-full bg-bg px-3 py-1.5 text-xs text-muted">{t("mock.search")}</span>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#021941] to-[#0A3A8C] p-4 text-white">
                <p className="text-xs opacity-80">{t("mock.total")}</p>
                <p className="font-numbers text-2xl font-black" dir="ltr">4.8M</p>
              </div>
              <div className="rounded-2xl bg-bg p-4">
                <p className="text-xs text-muted">{t("mock.creators")}</p>
                <p className="font-numbers text-2xl font-black">24</p>
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-line-soft">
              {MOCK.map((c) => (
                <li key={c.handle} className="flex items-center gap-3 py-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: c.hue }}>
                    {c.name[en ? "en" : "ar"].slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-bold">{c.name[en ? "en" : "ar"]} <VerifiedBadge size={14} /></p>
                    <p className="text-xs text-muted" dir="ltr">wsool.link/{c.handle}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-numbers text-sm font-black" dir="ltr">{c.followers}</p>
                    <p className="text-[11px] text-muted">{t("mock.followers")}</p>
                  </div>
                  <span className="hidden items-center gap-1 rounded-full bg-good/10 px-2 py-1 text-[11px] font-bold text-good sm:inline-flex"><Link2 size={12} /> {t("mock.linked")}</span>
                  <span className="rounded-full border border-line px-2 py-1 text-[11px] font-bold">{t("mock.pdf")}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Why */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-8 text-center text-2xl font-black md:text-3xl">{t("whyTitle")}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {why.map((w, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <div key={w.t} className="rounded-[20px] border border-line bg-card p-6 shadow-card">
                  <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue/10 text-blue"><Icon aria-hidden="true" size={20} /></span>
                  <h3 className="mb-2 text-lg font-bold">{w.t}</h3>
                  <p className="text-sm leading-7 text-muted">{w.b}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-8 text-center text-2xl font-black md:text-3xl">{t("howTitle")}</h2>
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {how.map((h, i) => (
              <li key={h.t} className="relative rounded-[20px] border border-line bg-card p-6">
                <span className="font-numbers mb-3 flex size-10 items-center justify-center rounded-full bg-navy text-base font-black text-on-navy">{i + 1}</span>
                <h3 className="mb-2 text-lg font-bold">{h.t}</h3>
                <p className="text-sm leading-7 text-muted">{h.b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features + coming soon */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-8 text-center text-2xl font-black md:text-3xl">{t("featuresTitle")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={f.t} className="flex gap-3 rounded-2xl border border-line bg-card p-5">
                  <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-blue" />
                  <div>
                    <h3 className="font-bold">{f.t}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{f.b}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <h3 className="mt-10 mb-4 text-center text-lg font-bold text-muted">{t("soonTitle")}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {soon.map((s, i) => {
              const Icon = SOON_ICONS[i];
              return (
                <div key={s.t} className="flex gap-3 rounded-2xl border border-dashed border-line p-5">
                  <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-muted" />
                  <div>
                    <h4 className="font-bold">{s.t}</h4>
                    <p className="mt-1 text-sm leading-6 text-muted">{s.b}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* The page belongs to the creator */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-1 items-center gap-6 rounded-[24px] bg-gradient-to-br from-[#021941] to-[#0A3A8C] p-7 text-white md:grid-cols-[1.2fr_1fr] md:p-10">
            <div>
              <ShieldCheck aria-hidden="true" size={32} className="mb-3 text-[#7DD3FC]" />
              <h2 className="mb-3 text-2xl font-black md:text-3xl">{t("ownTitle")}</h2>
              <p className="leading-8 opacity-90">{t("ownBody")}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-semibold">
                  <Check aria-hidden="true" size={18} className="shrink-0 text-[#7DD3FC]" /> {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
          <h2 className="mb-2 text-center text-2xl font-black md:text-3xl">{t("pricingTitle")}</h2>
          <p className="mb-8 text-center text-sm text-muted">{t("pricingNote")}</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`flex flex-col gap-4 rounded-[22px] border p-6 ${p.popular ? "border-blue bg-card shadow-[0_20px_50px_-25px_rgba(0,96,230,0.45)]" : "border-line bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-black">{p.name}</h3>
                  {p.popular && <span className="rounded-full bg-blue/10 px-3 py-1 text-xs font-bold text-blue">{p.popular}</span>}
                </div>
                <p className="text-sm text-muted">{p.creators}</p>
                <p className="flex items-end gap-2">
                  <span className={`font-numbers font-black ${p.per ? "text-4xl" : "text-2xl"}`}>{p.price}</span>
                  {p.per && <span className="pb-1 text-sm text-muted">{p.per}</span>}
                </p>
                <p className="text-sm leading-6 text-muted">{t("planIncludes")}</p>
                <Link href={TRIAL} className={buttonClasses(p.popular ? "primary" : "secondary", "mt-auto")}>{t("ctaTrial")}</Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="mb-6 text-center text-2xl font-black md:text-3xl">{t("faqTitle")}</h2>
          <div className="flex flex-col gap-3">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-line bg-card p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                  {f.q} <span aria-hidden="true" className="text-xl text-blue transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section className="mx-auto max-w-6xl px-4 pt-6 pb-16">
          <div className="flex flex-col items-center gap-4 rounded-[24px] border border-line bg-card p-8 text-center md:p-12">
            <h2 className="text-2xl font-black md:text-3xl">{t("finalTitle")}</h2>
            <p className="max-w-xl text-muted">{t("finalBody")}</p>
            <Link href={TRIAL} className={buttonClasses("primary", "px-8")}>{t("ctaTrial")}</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">{t("footer")}</footer>
    </div>
  );
}
