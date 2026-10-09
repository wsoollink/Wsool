import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import type { InvestorSection } from "@/config/finance";
import { toIntlLocale, type Locale } from "@/i18n/config";
import type { FinanceReport } from "@/lib/finance";
import { formatNumber, formatPercent, formatPrice } from "@/lib/format";

type Props = {
  report: FinanceReport;
  growth?: { users: number; published: number; verified: number };
  sections: readonly InvestorSection[];
  lang: Locale;
};

/**
 * Finance numbers shared by the admin Finance page and investor links:
 * totals and unit economics as stat tiles, the monthly P&L as a table.
 * Amounts in SAR without VAT; no personal data.
 */
export async function FinanceView({ report, growth, sections, lang }: Props) {
  const t = await getTranslations("Finance");
  const sar = (v: number) => formatPrice(Math.round(v), "SAR", lang);
  const pct = (v: number | null) => (v === null ? "—" : formatPercent(Math.round(v * 1000) / 10, lang));
  const monthShort = new Intl.DateTimeFormat(toIntlLocale(lang), { month: "short", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat(toIntlLocale(lang), { month: "short", year: "numeric", timeZone: "UTC" });
  const tile = (label: string, value: string, hint?: string, tone = "") => (
    <Card key={label} className="flex flex-col gap-1.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`font-numbers text-[26px] leading-none font-black ${tone}`}>{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );

  const ltvCac = report.unit.ltv !== null && report.unit.cac ? report.unit.ltv / report.unit.cac : null;
  const top = Math.max(1, ...report.months.flatMap((r) => [r.revenue, r.expenses]));
  const categoryTotal = report.byCategory.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="flex flex-col gap-6">
      {sections.includes("revenue") && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t("summary")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tile(t("revenue"), sar(report.totals.revenue))}
            {tile(t("expenses"), sar(report.totals.expenses))}
            {tile(t("profit"), sar(report.totals.profit), undefined, report.totals.profit < 0 ? "text-bad" : report.totals.profit > 0 ? "text-good" : "")}
            {tile(t("margin"), report.totals.revenue ? pct(report.totals.profit / report.totals.revenue) : "—", t("marginHint"))}
          </div>
        </section>
      )}

      {sections.includes("unit") && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t("unitEconomics")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tile(t("mrr"), sar(report.unit.mrr), report.unit.mrrGrowth === null ? undefined : t("vsLastMonth", { value: pct(report.unit.mrrGrowth) }))}
            {tile(t("customers"), formatNumber(report.unit.customers, lang))}
            {tile(t("arpu"), report.unit.arpu === null ? "—" : sar(report.unit.arpu), t("perMonth"))}
            {tile(t("churn"), pct(report.unit.churn), t("monthlyAvg"))}
            {tile(t("ltv"), report.unit.ltv === null ? "—" : sar(report.unit.ltv))}
            {tile(t("cac"), report.unit.cac === null ? "—" : sar(report.unit.cac))}
            {tile(t("ltvCac"), ltvCac === null ? "—" : `${formatNumber(Math.round(ltvCac * 10) / 10, lang)}x`, t("ltvCacHint"), ltvCac === null ? "" : ltvCac >= 3 ? "text-good" : "text-warn")}
          </div>
        </section>
      )}

      {sections.includes("growth") && growth && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t("growth")}</h2>
          <div className="grid grid-cols-3 gap-3">
            {tile(t("users"), formatNumber(growth.users, lang))}
            {tile(t("published"), formatNumber(growth.published, lang))}
            {tile(t("verified"), formatNumber(growth.verified, lang))}
          </div>
        </section>
      )}

      {sections.includes("pnl") && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t("pnl")}</h2>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold">{t("revenueVsExpenses")}</h3>
                <span className="flex gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-blue" />{t("revenue")}</span>
                  <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-navy/25" />{t("expenses")}</span>
                </span>
              </div>
              {/* The table below has the same numbers for screen readers. */}
              <div aria-hidden="true" className="flex h-44 items-end gap-2">
                {report.months.map((r) => (
                  <div key={r.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex h-full w-full items-end justify-center gap-[3px]">
                      <span className="w-full max-w-5 rounded-t-[4px] bg-blue" style={{ height: `${Math.max(1, (r.revenue / top) * 100)}%` }} />
                      <span className="w-full max-w-5 rounded-t-[4px] bg-navy/25" style={{ height: `${Math.max(1, (r.expenses / top) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted">{monthShort.format(new Date(`${r.month}-01T00:00:00Z`))}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="flex flex-col gap-3">
              <h3 className="text-sm font-bold">{t("byCategory")}</h3>
              {report.byCategory.length === 0 ? (
                <p className="text-sm text-muted">{t("noExpenses")}</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {report.byCategory.map(([category, value]) => (
                    <li key={category} className="flex flex-col gap-1">
                      <span className="flex justify-between gap-2 text-[13px]"><span>{t(`categories.${category}`)}</span><b className="font-numbers">{sar(value)}</b></span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-navy/5"><span className="block h-full rounded-full bg-blue" style={{ width: `${(value / categoryTotal) * 100}%` }} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-navy/6">
                  {["month", "revenue", "expenses", "profit", "mrr", "customers"].map((h) => (
                    <th key={h} scope="col" className={`p-3 font-medium ${h === "month" ? "text-start" : "text-end"}`}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.months.map((r) => (
                  <tr key={r.month} className="border-b border-navy/6 last:border-0">
                    <th scope="row" className="p-3 text-start font-medium">{month.format(new Date(`${r.month}-01T00:00:00Z`))}</th>
                    <td className="p-3 text-end">{sar(r.revenue)}</td>
                    <td className="p-3 text-end">{sar(r.expenses)}</td>
                    <td className={`p-3 text-end font-bold ${r.profit < 0 ? "text-bad" : r.profit > 0 ? "text-good" : ""}`}>{sar(r.profit)}</td>
                    <td className="p-3 text-end">{sar(r.mrr)}</td>
                    <td className="p-3 text-end">{formatNumber(r.customers, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-muted">{t("note")}</p>
        </section>
      )}
    </div>
  );
}
