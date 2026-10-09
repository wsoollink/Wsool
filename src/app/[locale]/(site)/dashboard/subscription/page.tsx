import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { hasPro, trialDaysLeft } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";
import { getAdmin } from "@/lib/admin";
import { invoiceLabel } from "@/lib/billing";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
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

      <Card className="flex flex-col gap-2">
        <p className="text-xs text-muted">{t("currentPlan")}</p>
        <p className="text-2xl font-bold">{pro ? "Pro" : t("free")}{active && sub?.cycle && <span className="ms-2 text-sm font-normal text-muted">{t(sub.cycle)}</span>}</p>
        <p className={`text-sm ${sub?.status === "past_due" ? "text-bad" : "text-muted"}`}>{status}</p>
        {active && sub?.paymentMethodLabel && <p className="text-sm text-muted" dir="ltr">{sub.paymentMethodLabel}</p>}
      </Card>

      {active && sub?.cycle && !sub.cancelAtPeriodEnd ? (
        <ManageCard autoRenew cycle={sub.cycle} hasCard={!!sub.paymentToken} />
      ) : active && sub?.cycle ? (
        <>
          <ManageCard autoRenew={false} cycle={sub.cycle} hasCard={!!sub.paymentToken} />
          {!sub.paymentToken && <PlanPicker defaultCurrency={sub.currency ?? (lang === "en" ? "USD" : "SAR")} canPay={canPay} renew />}
        </>
      ) : (
        <PlanPicker defaultCurrency={sub?.currency ?? (lang === "en" ? "USD" : "SAR")} canPay={canPay} renew={false} />
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="font-bold">{t("invoices")}</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">{t("noInvoices")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                <span className="font-medium" dir="ltr">{invoiceLabel(inv.number)}</span>
                <span className="text-muted">{date.format(inv.paidAt ?? inv.createdAt)}</span>
                <span className="font-numbers">{formatPrice(Number(inv.amount), inv.currency, lang)}</span>
                <span className={inv.status === "paid" ? "text-good" : inv.status === "refunded" ? "text-warn" : "text-bad"}>{t(`invoiceStatus.${inv.status}`)}</span>
                {inv.number && <Link href={`/dashboard/subscription/invoices/${inv.id}`} className="ms-auto min-h-11 content-center text-blue underline">{t("view")}</Link>}
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
