import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleDollarSign, Clock, MousePointerClick, UserPlus, Wallet } from "lucide-react";
import { AreaChart } from "@/components/charts/AreaChart";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProNotice } from "@/components/dashboard/ProNotice";
import { Card, Panel } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Pill } from "@/components/ui/Pill";
import { hasPro, planLabel } from "@/config/plans";
import { REFERRAL } from "@/config/referrals";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { today } from "@/lib/analytics";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatNumber, formatPrice } from "@/lib/format";
import { maskIban, referralBalance, referralLink } from "@/lib/referrals";
import { PayoutForm } from "./PayoutForm";
import { RefLink } from "./RefLink";

const DAYS = 30;

async function Program({ lang }: { lang: Locale }) {
  const { user, page } = await requireCreator();
  const t = await getTranslations("Referrals");
  const sar = (n: number) => formatPrice(n, "SAR", lang);
  const sub = await db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } });
  const pro = hasPro(sub);

  const since = new Date(today().getTime() - (DAYS - 1) * 86_400_000);
  const [balance, clicksAll, clicksDays, customers, commissions, payouts, account] = await Promise.all([
    referralBalance(user.id),
    db.referralClick.count({ where: { referrerId: user.id } }),
    db.referralClick.groupBy({ by: ["day"], where: { referrerId: user.id, day: { gte: since } }, _count: { _all: true } }),
    db.user.findMany({
      where: { referredById: user.id },
      orderBy: { referredAt: "desc" },
      take: 200,
      select: { id: true, referredAt: true, createdAt: true, subscription: { select: { status: true, trialEndsAt: true } } },
    }),
    db.referralCommission.groupBy({ by: ["referredUserId"], where: { referrerId: user.id, cancelledAt: null }, _sum: { amount: true } }),
    db.referralPayout.findMany({ where: { referrerId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.referralAccount.findUnique({ where: { userId: user.id } }),
  ]);
  const earnedBy = new Map(commissions.map((c) => [c.referredUserId, Number(c._sum.amount ?? 0)]));
  const paying = commissions.filter((c) => c.referredUserId && Number(c._sum.amount ?? 0) > 0).length;
  const signups = await db.user.count({ where: { referredById: user.id } });

  const locale = toIntlLocale(lang);
  const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const perDay = new Map(clicksDays.map((d) => [d.day.toISOString().slice(0, 10), d._count._all]));
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since.getTime() + i * 86_400_000);
    const n = perDay.get(d.toISOString().slice(0, 10)) ?? 0;
    return { label: dayLabel.format(d), value: n, text: t("clicksCount", { count: n }) };
  });
  const clicks30 = series.reduce((s, p) => s + p.value, 0);
  const ticks = [0, 10, 20, DAYS - 1].map((i) => series[i].label);
  const statusTone = { pro: "good", trial: "blue", free: "grey" } as const;

  return (
    <div className="flex flex-col gap-4">
      {!pro && <ProNotice text={t("proOnly")} />}

      <RefLink url={referralLink(page.username)} username={page.username} disabled={!pro} />

      <KpiStrip
        items={[
          { label: t("stat.clicks"), icon: <MousePointerClick aria-hidden="true" size={14} />, value: formatNumber(clicksAll, lang), note: t("last30", { n: formatNumber(clicks30, lang) }), spark: series.slice(-14).map((p) => p.value) },
          { label: t("stat.signups"), icon: <UserPlus aria-hidden="true" size={14} />, value: formatNumber(signups, lang) },
          { label: t("stat.paying"), icon: <CircleDollarSign aria-hidden="true" size={14} />, value: formatNumber(paying, lang) },
          { label: t("stat.earned"), icon: <Wallet aria-hidden="true" size={14} />, value: sar(balance.earned), note: t("rule", { percent: REFERRAL.percent, months: REFERRAL.months }) },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title={t("clicksChart")} aside={t("lastDays", { n: DAYS })}>
          <AreaChart points={series} ticks={ticks} ariaLabel={t("clicksChartAlt", { total: formatNumber(clicks30, lang) })} />
        </Panel>

        <Panel title={t("balance")} bodyClassName="flex flex-col gap-3">
          <dl className="flex flex-col divide-y divide-line-soft text-sm">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <dt className="flex items-center gap-2"><Clock aria-hidden="true" size={15} className="text-muted" />{t("pending")}</dt>
              <dd dir="ltr" className="font-semibold tabular-nums">{sar(balance.pending)}</dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <dt className="flex items-center gap-2"><Wallet aria-hidden="true" size={15} className="text-good" />{t("available")}</dt>
              <dd dir="ltr" className="font-numbers text-lg tabular-nums text-good">{sar(balance.available)}</dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <dt className="text-muted">{t("paidOut")}</dt>
              <dd dir="ltr" className="tabular-nums text-muted">{sar(balance.paidOut)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">{t("holdNote", { days: REFERRAL.holdDays })}</p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={t("customers")} aside={formatNumber(signups, lang)} flush>
          {customers.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">{t("noCustomers")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg text-[11.5px] text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2 text-start font-semibold">{t("table.customer")}</th>
                    <th scope="col" className="px-3 py-2 text-start font-semibold">{t("table.joined")}</th>
                    <th scope="col" className="px-3 py-2 text-start font-semibold">{t("table.plan")}</th>
                    <th scope="col" className="px-5 py-2 text-end font-semibold">{t("table.commission")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {customers.map((c, i) => {
                    const plan = planLabel(c.subscription);
                    return (
                      <tr key={c.id}>
                        <td className="px-5 py-3">{t("customerN", { n: customers.length - i })}</td>
                        <td className="px-3 py-3 text-muted">{date.format(c.referredAt ?? c.createdAt)}</td>
                        <td className="px-3 py-3"><Pill tone={statusTone[plan]}>{t(`plan.${plan}`)}</Pill></td>
                        <td dir="ltr" className="px-5 py-3 text-end tabular-nums rtl:text-start">{sar(earnedBy.get(c.id) ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <PayoutForm
            method={account?.payoutMethod ?? "credit"}
            maskedIban={maskIban(account?.iban ?? null)}
            holderName={account?.holderName ?? ""}
            minBank={sar(REFERRAL.minBankPayout)}
          />
          <Panel title={t("payouts")} flush>
            {payouts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">{t("noPayouts")}</p>
            ) : (
              <ul className="divide-y divide-line-soft text-sm">
                {payouts.map((p) => (
                  <li key={p.id} className="flex min-h-11 items-center justify-between gap-3 px-5 py-2">
                    <span className="flex flex-col">
                      <span>{t(`method.${p.method}`)}</span>
                      <span className="text-xs text-muted">{date.format(p.createdAt)}{p.note ? ` · ${p.note}` : ""}</span>
                    </span>
                    <span dir="ltr" className="font-semibold tabular-nums">{sar(Number(p.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Card className="text-[13px] leading-6 text-muted">
        <h2 className="mb-1 text-sm font-bold text-navy">{t("howTitle")}</h2>
        <ul className="list-disc ps-5">
          <li>{t("how1", { percent: REFERRAL.percent, months: REFERRAL.months })}</li>
          <li>{t("how2", { days: REFERRAL.cookieDays })}</li>
          <li>{t("how3", { days: REFERRAL.holdDays })}</li>
          <li>{t("how4", { min: sar(REFERRAL.minBankPayout) })}</li>
        </ul>
      </Card>
    </div>
  );
}

export default async function ReferralsPage({ params }: PageProps<"/[locale]/dashboard/referrals">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={nav("referrals")} section="referrals" />
      <Suspense fallback={null}><Program lang={locale} /></Suspense>
    </div>
  );
}
