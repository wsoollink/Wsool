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
import { formatNumber, formatPrice } from "@/lib/format";
import { paymentProvider } from "@/lib/payments";
import { RefundButton } from "./RefundButton";

async function Overview({ lang }: { lang: Locale }) {
  const admin = await requireAdmin("revenue.view");
  const t = await getTranslations("Admin.subscriptions");
  const [byStatus, active, invoices] = await Promise.all([
    db.subscription.groupBy({ by: ["status"], _count: true }),
    db.subscription.findMany({ where: { status: { in: ["active", "past_due"] } }, select: { cycle: true, currency: true } }),
    db.invoice.findMany({
      where: { status: { in: ["paid", "refunded", "failed"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { subscription: { select: { user: { select: { email: true, page: { select: { username: true } } } } } } },
    }),
  ]);
  const count = (s: string) => byStatus.find((x) => x.status === s)?._count ?? 0;
  // Monthly recurring revenue per currency (yearly plans count as 1/12).
  const mrr = { SAR: 0, USD: 0 };
  for (const s of active) if (s.cycle && s.currency) mrr[s.currency] += s.cycle === "monthly" ? PRICES[s.currency].monthly : PRICES[s.currency].yearly / 12;
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  const provider = paymentProvider();

  const tiles = [
    { label: t("trialing"), value: formatNumber(count("trialing"), lang) },
    { label: t("active"), value: formatNumber(count("active"), lang) },
    { label: t("pastDue"), value: formatNumber(count("past_due"), lang) },
    { label: t("ended"), value: formatNumber(count("canceled") + count("expired"), lang) },
    { label: t("mrrSar"), value: formatPrice(Math.round(mrr.SAR), "SAR", lang) },
    { label: t("mrrUsd"), value: formatPrice(Math.round(mrr.USD), "USD", lang) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className={`rounded-xl p-3 text-sm ${provider ? (provider.testOnly ? "bg-warn/10 text-warn" : "bg-good/10 text-good") : "bg-navy/5 text-muted"}`}>
        {provider ? (provider.testOnly ? t("providerTest") : t("providerLive", { name: provider.name })) : t("providerOff")}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1">
            <span className="text-xs text-muted">{tile.label}</span>
            <span className="font-numbers text-2xl font-bold">{tile.value}</span>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        <h2 className="p-4 pb-0 font-bold">{t("payments")}</h2>
        {invoices.length === 0 ? (
          <p className="p-4 text-sm text-muted">{t("noPayments")}</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                {["invoice", "creator", "amount", "status", "date", ""].map((h) => <th key={h} scope="col" className="p-3 text-start font-medium">{h && t(`table.${h}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const who = inv.subscription.user.page?.username ?? inv.subscription.user.email;
                return (
                  <tr key={inv.id} className="border-b border-line last:border-0">
                    <td className="p-3" dir="ltr">{invoiceLabel(inv.number)} <span className="text-xs text-muted">{t(`kind.${inv.kind}`)}</span></td>
                    <td className="p-3" dir="ltr"><Link href={`/admin/users/${inv.userId}`} className="text-blue underline">{who}</Link></td>
                    <td className="p-3">{formatPrice(Number(inv.amount), inv.currency, lang)}</td>
                    <td className={`p-3 ${inv.status === "paid" ? "text-good" : inv.status === "refunded" ? "text-warn" : "text-bad"}`}>
                      {t(`status.${inv.status}`)}{inv.failureReason && <span className="block text-xs text-muted">{inv.failureReason}</span>}
                    </td>
                    <td className="p-3">{date.format(inv.paidAt ?? inv.createdAt)}</td>
                    <td className="p-3">{inv.status === "paid" && can(admin, "refunds") && <RefundButton invoiceId={inv.id} label={invoiceLabel(inv.number)} />}</td>
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
      <h1 className="text-2xl font-bold">{nav("subscriptions")}</h1>
      <Suspense fallback={null}><Overview lang={locale} /></Suspense>
    </div>
  );
}
