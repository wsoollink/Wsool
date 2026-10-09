import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PRICES, hasPro, trialDaysLeft } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";
import { getAdmin } from "@/lib/admin";
import { invoiceLabel } from "@/lib/billing";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatNumber, formatPrice } from "@/lib/format";
import { CreditCard, FileText } from "lucide-react";
import { paymentProvider } from "@/lib/payments";
import { DangerZone } from "./DangerZone";
import { ManageCard } from "./ManageCard";
import { PlanPicker } from "./PlanPicker";
import { PageHeader } from "@/components/dashboard/PageHeader";

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Subscription({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  const { user, page } = await requireCreator();
  const t = await getTranslations("Billing");
  const result = String((await searchParams).payment ?? "");
  const [sub, invoices, staff] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id } }),
    db.invoice.findMany({ where: { userId: user.id, status: { in: ["paid", "refunded", "failed"] } }, orderBy: { createdAt: "desc" }, take: 24 }),
    getAdmin(),
  ]);
  const provider = paymentProvider();
  const canPay = !!provider && (!provider.testOnly || !!staff) && !page.deletedAt;
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long" });
  const active = sub?.status === "active" || sub?.status === "past_due";
  const pro = hasPro(sub);
  const purgeDate = page.deletedAt ? date.format(new Date(page.deletedAt.getTime() + DELETE_AFTER_DAYS * 86_400_000)) : null;

  let status: string;
  if (sub?.status === "past_due") status = t("status.pastDue", { date: sub.nextRetryAt ? date.format(sub.nextRetryAt) : "" });
  else if (active && sub?.currentPeriodEnd) status = sub.cancelAtPeriodEnd ? t("status.endsOn", { date: date.format(sub.currentPeriodEnd) }) : t("status.renewsOn", { date: date.format(sub.currentPeriodEnd) });
  else if (pro && sub?.trialEndsAt) status = t("status.trial", { days: trialDaysLeft(sub.trialEndsAt), date: date.format(sub.trialEndsAt) });
  else status = t("status.free");

  return (
    <div className="flex flex-col gap-4">
      {result && (
        <p role="status" className={`rounded-xl p-3 text-sm ${result === "paid" ? "bg-good/10 text-good" : result === "pending" ? "bg-blue/10 text-blue" : "bg-bad/10 text-bad"}`}>
          {t(`result.${["paid", "pending"].includes(result) ? result : "failed"}`)}
        </p>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-muted">{t("currentPlan")}</span>
            <h2 className="text-xl font-bold">{pro ? t("paidPlan") : t("freePlan")}</h2>
            <p className={`text-[13px] ${sub?.status === "past_due" ? "text-bad" : "text-muted"}`}>{status}</p>
          </div>
          {active && sub?.cycle && sub.currency && (
            <div className="flex shrink-0 flex-col items-end">
              <span dir="ltr" className="font-numbers text-3xl font-black">{formatNumber(PRICES[sub.currency][sub.cycle], lang)}</span>
              <span className="text-xs text-muted">{t(sub.cycle === "yearly" ? "unitYear" : "unitMonth", { currency: sub.currency })}</span>
            </div>
          )}
        </div>
        {active && sub?.paymentMethodLabel && (
          <div className="flex items-center gap-3 rounded-xl bg-navy/5 px-3 py-2.5">
            <CreditCard aria-hidden="true" size={18} />
            <span className="flex flex-col">
              <span className="text-[13px] font-bold">{t("paymentMethod")}</span>
              <span dir="ltr" className="text-xs text-muted rtl:text-end">{sub.paymentMethodLabel}</span>
            </span>
          </div>
        )}
        {active && sub?.cycle && sub.currentPeriodEnd && (
          <ManageCard autoRenew={!sub.cancelAtPeriodEnd} cycle={sub.cycle} hasCard={!!sub.paymentToken} endDate={date.format(sub.currentPeriodEnd)} />
        )}
      </Card>

      {!(active && sub?.cycle && !sub.cancelAtPeriodEnd) && (!active || !sub?.paymentToken) && (
        <PlanPicker
          defaultCurrency={sub?.currency ?? (lang === "en" ? "USD" : "SAR")} canPay={canPay}
          renew={active && !!sub?.cycle} showTrial={!sub || sub.status === "trialing"}
        />
      )}

      <Card className="flex flex-col gap-1">
        <h2 className="mb-1 font-bold">{t("invoices")}</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">{t("noInvoices")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-navy/6">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{date.format(inv.paidAt ?? inv.createdAt)}</span>
                  <span className={`text-xs ${inv.status === "paid" ? "text-good" : inv.status === "refunded" ? "text-warn" : "text-bad"}`}>
                    {t(`invoiceStatus.${inv.status}`)} {inv.number && <span dir="ltr" className="text-muted">· {invoiceLabel(inv.number)}</span>}
                  </span>
                </span>
                <span className="font-numbers text-sm font-bold">{formatPrice(Number(inv.amount), inv.currency, lang)}</span>
                {inv.number && (
                  <Link href={`/dashboard/subscription/invoices/${inv.id}`} aria-label={t("viewInvoice", { date: date.format(inv.paidAt ?? inv.createdAt) })} className="inline-flex size-11 items-center justify-center rounded-xl bg-navy/5">
                    <FileText aria-hidden="true" size={18} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <DangerZone username={page.username} deletedAt={!!page.deletedAt} purgeDate={purgeDate} />
    </div>
  );
}

export default async function SubscriptionPage({ params, searchParams }: PageProps<"/[locale]/dashboard/subscription">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={nav("subscription")} section="subscription" />
      <Suspense fallback={null}><Subscription lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
