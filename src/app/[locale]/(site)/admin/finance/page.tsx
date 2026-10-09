import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinanceView } from "@/components/finance/FinanceView";
import { FINANCE_PERIODS, INVESTOR_SECTIONS } from "@/config/finance";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { financeReport, growthCounts } from "@/lib/finance";
import { formatPrice } from "@/lib/format";
import { ExpensesCard } from "./ExpensesCard";
import { InvestorLinks } from "./InvestorLinks";
import { AdminHeader } from "@/components/admin/AdminHeader";

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Finance({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  const admin = await requireAdmin("revenue.view");
  const t = await getTranslations("Finance");
  const raw = Number((await searchParams).months);
  const months = (FINANCE_PERIODS as readonly number[]).includes(raw) ? raw : 6;
  const [report, growth, expenses, links] = await Promise.all([
    financeReport(months),
    growthCounts(),
    db.expense.findMany({ orderBy: { date: "desc" }, take: 50 }),
    admin.isOwner ? db.investorLink.findMany({ orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium", timeZone: "UTC" });
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={t("period")} className="flex flex-wrap gap-2">
        {FINANCE_PERIODS.map((m) => (
          <Link key={m} href={`/admin/finance?months=${m}`} aria-current={m === months ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-[13.5px] font-bold ${m === months ? "bg-navy text-white" : "bg-white ring-1 ring-navy/10"}`}>
            {t("lastMonths", { n: m })}
          </Link>
        ))}
      </nav>
      <FinanceView report={report} growth={growth} sections={INVESTOR_SECTIONS} lang={lang} />
      <ExpensesCard
        today={now.toISOString().slice(0, 10)}
        rows={expenses.map((e) => ({
          id: e.id, label: date.format(e.date), amount: formatPrice(Number(e.amount), e.currency, lang),
          category: e.category, recurrence: e.recurrence, description: e.description,
        }))}
      />
      {admin.isOwner && (
        <InvestorLinks
          links={links.map((l) => ({
            id: l.id, label: l.label, views: l.views, password: !!l.passwordHash, sections: l.sections as string[],
            status: l.revokedAt ? "revoked" : l.expiresAt < now ? "expired" : "active", expires: date.format(l.expiresAt),
          }))}
        />
      )}
    </div>
  );
}

export default async function FinancePage({ params, searchParams }: PageProps<"/[locale]/admin/finance">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("finance")} subtitle={(await getTranslations("Admin.sub"))("finance")} search={false} />
      <Suspense fallback={null}><Finance lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
