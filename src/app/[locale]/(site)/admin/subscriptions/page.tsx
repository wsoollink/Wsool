import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PRICES } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { invoiceLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { formatAmount, formatNumber, formatPrice } from "@/lib/format";
import { USD_TO_SAR } from "@/lib/finance";
import { Download } from "lucide-react";
import { paymentProvider } from "@/lib/payments";
import { RefundButton } from "./RefundButton";
import { AdminHeader } from "@/components/admin/AdminHeader";

/** Subscriptions from the admin design: 5 tiles, failed payments to follow up, payments table, CSV. */
async function Overview({ lang }: { lang: Locale }) {
  const admin = await requireAdmin("revenue.view");
  const t = await getTranslations("Admin.subscriptions");
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [active, trialing, pastDue, monthInvoices, invoices] = await Promise.all([
    db.subscription.findMany({ where: { status: { in: ["active", "past_due"] } }, select: { cycle: true, currency: true } }),
    db.subscription.count({ where: { status: "trialing", trialEndsAt: { gt: now } } }),
    db.subscription.findMany({
      where: { status: "past_due" },
      orderBy: { nextRetryAt: "asc" },
      select: { userId: true, failedAttempts: true, nextRetryAt: true, cycle: true, currency: true, paymentMethodLabel: true, user: { select: { email: true, page: { select: { username: true } } } } },
    }),
    db.invoice.findMany({ where: { status: "paid", paidAt: { gte: monthStart } }, select: { amount: true, vatAmount: true, currency: true } }),
    db.invoice.findMany({
      where: { status: { in: ["paid", "refunded", "failed"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { subscription: { select: { user: { select: { email: true, page: { select: { username: true } } } } } } },
    }),
  ]);
  // MRR in SAR, VAT included as charged (yearly plans count as 1/12; USD at the fixed peg).
  const sar = (amount: number, currency: string) => (currency === "USD" ? amount * USD_TO_SAR : amount);
  let mrr = 0;
  for (const s of active) if (s.cycle && s.currency) mrr += sar(s.cycle === "monthly" ? PRICES[s.currency].monthly : PRICES[s.currency].yearly / 12, s.currency);
  const yearly = active.filter((s) => s.cycle === "yearly").length;
  const revenue = monthInvoices.reduce((sum, i) => sum + sar(Number(i.amount) - Number(i.vatAmount), i.currency), 0);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  const provider = paymentProvider();

  const tiles = [
    { label: t("active"), value: formatNumber(active.length, lang), note: t("split", { monthly: active.length - yearly, yearly }) },
    { label: t("mrr"), value: formatAmount(Math.round(mrr), lang), note: t("sarVat") },
    { label: t("revenueMonth"), value: formatAmount(Math.round(revenue), lang), note: t("sarNoVat") },
    { label: t("trialing"), value: formatNumber(trialing, lang) },
    { label: t("pastDue"), value: formatNumber(pastDue.length, lang), bad: pastDue.length > 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className={`rounded-xl p-3 text-sm ${provider ? (provider.testOnly ? "bg-warn/10 text-warn" : "bg-good/10 text-good") : "bg-navy/5 text-muted"}`}>
        {provider ? (provider.testOnly ? t("providerTest") : t("providerLive", { name: provider.name })) : t("providerOff")}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted">{tile.label}</span>
            <span className={`font-numbers text-[28px] leading-none font-black ${tile.bad ? "text-bad" : ""}`}>{tile.value}</span>
            {tile.note && <span className="text-xs text-muted">{tile.note}</span>}
          </Card>
        ))}
      </div>

      {pastDue.length > 0 && (
        <Card className="flex flex-col gap-2 border-bad/20">
          <div>
            <h2 className="font-bold">{t("failedTitle")}</h2>
            <p className="text-xs text-muted">{t("failedHint")}</p>
          </div>
          <ul className="flex flex-col divide-y divide-navy/6">
            {pastDue.map((s) => (
              <li key={s.userId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <Link href={`/admin/users/${s.userId}`} dir="ltr" className="inline-flex min-h-11 min-w-0 flex-1 items-center font-bold text-blue">{s.user.page?.username ?? s.user.email}</Link>
                <span className="text-xs text-muted">{s.paymentMethodLabel ?? "—"}</span>
                <span className="rounded-full bg-bad/8 px-2.5 py-1 text-xs font-bold text-bad">{t("attempts", { n: s.failedAttempts })}</span>
                <span className="text-xs text-muted">{s.nextRetryAt ? t("nextRetry", { date: date.format(s.nextRetryAt) }) : t("noRetry")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-2">
          <h2 className="font-bold">{t("payments")}</h2>
          {/* A route handler download, not a page: plain <a>. */}
          <a href="/api/admin/invoices" download className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy/5 px-4 text-[13px] font-bold"><Download aria-hidden="true" size={16} /> {t("exportCsv")}</a>
        </div>
        {invoices.length === 0 ? (
          <p className="p-4 text-sm text-muted">{t("noPayments")}</p>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-navy/8">
                {["invoice", "creator", "plan", "amount", "status", "date", ""].map((h) => <th key={h} scope="col" className="px-4 py-3 text-start font-medium">{h && t(`table.${h}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const who = inv.subscription.user.page?.username ?? inv.subscription.user.email;
                const tone = inv.status === "paid" ? "bg-good/10 text-good" : inv.status === "refunded" ? "bg-warn/10 text-warn" : "bg-bad/8 text-bad";
                return (
                  <tr key={inv.id} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap" dir="ltr">{invoiceLabel(inv.number)} <span className="text-xs text-muted">{t(`kind.${inv.kind}`)}</span></td>
                    <td className="px-4 py-3" dir="ltr"><Link href={`/admin/users/${inv.userId}`} className="inline-flex min-h-11 items-center font-bold text-blue">{who}</Link></td>
                    <td className="px-4 py-3">{t(`cycle.${inv.cycle}`)}</td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">{formatPrice(Number(inv.amount), inv.currency, lang)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{t(`status.${inv.status}`)}</span>
                      {inv.failureReason && <span className="mt-1 block text-xs text-muted">{inv.failureReason}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{date.format(inv.paidAt ?? inv.createdAt)}</td>
                    <td className="px-4 py-3">{inv.status === "paid" && can(admin, "refunds") && <RefundButton invoiceId={inv.id} label={invoiceLabel(inv.number)} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export default async function SubscriptionsPage({ params }: PageProps<"/[locale]/admin/subscriptions">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("subscriptions")} subtitle={(await getTranslations("Admin.sub"))("subscriptions")} />
      <Suspense fallback={null}><Overview lang={locale} /></Suspense>
    </div>
  );
}
