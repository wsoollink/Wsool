import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Download, HandCoins, UserPlus, Wallet } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Pill } from "@/components/ui/Pill";
import { REFERRAL } from "@/config/referrals";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { formatNumber, formatPrice } from "@/lib/format";
import { referrerRows } from "@/lib/referrals";
import { PayoutButton } from "./PayoutButton";

/** Affiliate commissions: who is owed what, bank details for transfers, "Transferred" to record a payout. */
async function Commissions({ lang }: { lang: Locale }) {
  await requireAdmin("referrals.manage");
  const t = await getTranslations("Admin.referrals");
  const rows = await referrerRows();
  const sar = (n: number) => formatPrice(n, "SAR", lang);
  const total = (k: "pending" | "available" | "paidOut" | "signups") => rows.reduce((s, r) => s + r[k], 0);
  const due = rows.filter((r) => r.method === "bank" && r.available >= REFERRAL.minBankPayout);

  return (
    <div className="flex flex-col gap-4">
      <KpiStrip
        items={[
          { label: t("stat.due"), icon: <HandCoins aria-hidden="true" size={14} />, value: sar(due.reduce((s, r) => s + r.available, 0)), note: t("dueNote", { n: due.length, min: sar(REFERRAL.minBankPayout) }) },
          { label: t("stat.available"), icon: <Wallet aria-hidden="true" size={14} />, value: sar(total("available")) },
          { label: t("stat.pending"), icon: <Clock aria-hidden="true" size={14} />, value: sar(total("pending")), note: t("holdNote", { days: REFERRAL.holdDays }) },
          { label: t("stat.signups"), icon: <UserPlus aria-hidden="true" size={14} />, value: formatNumber(total("signups"), lang), note: t("paidOutNote", { amount: sar(total("paidOut")) }) },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{t("rule", { percent: REFERRAL.percent, months: REFERRAL.months })}</p>
        <a href="/api/admin/referrals" download className={buttonClasses("secondary")}><Download aria-hidden="true" size={15} /> {t("export")}</a>
      </div>

      {rows.length === 0 ? (
        <Card><p className="text-sm text-muted">{t("empty")}</p></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-bg text-[11.5px] text-muted">
              <tr className="border-b border-line-soft">
                {["creator", "method", "signups", "pending", "available", "paidOut", ""].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-start font-semibold">{h && t(`table.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-navy/6 last:border-0">
                  <td className="px-4 py-3">
                    <bdi dir="ltr" className="block font-bold">{r.username ?? "—"}</bdi>
                    <span dir="ltr" className="block text-xs text-muted rtl:text-end">{r.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={r.method === "bank" ? "blue" : "grey"}>{t(`method.${r.method}`)}</Pill>
                    {r.method === "bank" && r.iban && (
                      <span className="mt-1 block text-xs">
                        <code dir="ltr" className="block select-all">{r.iban}</code>
                        <span className="text-muted">{r.holderName}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(r.signups, lang)}</td>
                  <td dir="ltr" className="px-4 py-3 tabular-nums text-muted rtl:text-end">{sar(r.pending)}</td>
                  <td dir="ltr" className={`px-4 py-3 font-bold tabular-nums rtl:text-end ${r.available > 0 ? "text-good" : "text-muted"}`}>{sar(r.available)}</td>
                  <td dir="ltr" className="px-4 py-3 tabular-nums text-muted rtl:text-end">{sar(r.paidOut)}</td>
                  <td className="px-4 py-3">
                    {r.method === "bank" && r.iban && r.available > 0 ? (
                      <PayoutButton userId={r.userId} who={r.username ?? r.email} amount={sar(r.available)} />
                    ) : r.method === "credit" && r.available > 0 ? (
                      <span className="text-xs text-muted">{t("creditAuto")}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default async function ReferralsAdminPage({ params }: PageProps<"/[locale]/admin/referrals">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("referrals")} subtitle={(await getTranslations("Admin.sub"))("referrals")} />
      <Suspense fallback={null}><Commissions lang={locale} /></Suspense>
    </div>
  );
}
