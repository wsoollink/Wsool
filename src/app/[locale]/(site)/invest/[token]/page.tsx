import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import { Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { FinanceView } from "@/components/finance/FinanceView";
import { INVESTOR_SECTIONS, type InvestorSection } from "@/config/finance";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { financeReport, growthCounts } from "@/lib/finance";
import { hashToken, unlockCookie, unlockValue } from "@/lib/investor";
import { PrintButton } from "@/components/PrintButton";
import { Unlock } from "./Unlock";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, token: "_" }));
}

/** Read-only investor report (no personal user data); "Print / PDF" exports it. */
async function Report({ params, lang }: { params: Promise<{ token: string }>; lang: Locale }) {
  const { token } = await params;
  const t = await getTranslations("Finance");
  const link = await db.investorLink.findUnique({ where: { tokenHash: hashToken(token) } });
  const now = new Date();
  if (!link || link.revokedAt || link.expiresAt < now) {
    return <Card><p className="text-sm text-muted">{t("linkUnavailable")}</p></Card>;
  }
  if (link.passwordHash && (await cookies()).get(unlockCookie(link.id))?.value !== unlockValue(link.id)) {
    return <Card><Unlock token={token} /></Card>;
  }
  await db.investorLink.update({ where: { id: link.id }, data: { views: { increment: 1 }, lastViewedAt: now } });
  const sections = (link.sections as string[]).filter((s): s is InvestorSection => (INVESTOR_SECTIONS as readonly string[]).includes(s));
  const [report, growth] = await Promise.all([financeReport(link.months), sections.includes("growth") ? growthCounts() : Promise.resolve(undefined)]);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-bold text-blue">{t("investorReport")}</span>
          <h1 className="text-[28px] leading-tight font-black">{link.label}</h1>
          <p className="text-sm text-muted">{t("reportMeta", { months: link.months, date: date.format(now) })}</p>
        </div>
        <PrintButton label={t("printPdf")} />
      </div>
      <FinanceView report={report} growth={growth} sections={sections} lang={lang} />
      <p className="text-xs text-muted">{t("confidential", { date: date.format(link.expiresAt) })}</p>
    </div>
  );
}

export default async function InvestorPage({ params }: PageProps<"/[locale]/invest/[token]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Finance");
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-3 border-b border-navy/8 pb-4">
        <Image src={locale === "en" ? "/brand/logo-en.png" : "/brand/logo-ar.png"} alt={t("brand")} width={90} height={30} className="h-[30px] w-auto" priority />
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy/5 px-3 text-xs font-bold text-muted"><Eye aria-hidden="true" size={14} /> {t("readOnly")}</span>
      </header>
      <Suspense fallback={null}><Report params={params as Promise<{ token: string }>} lang={locale} /></Suspense>
    </main>
  );
}
