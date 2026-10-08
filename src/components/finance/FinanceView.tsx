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
  const month = new Intl.DateTimeFormat(toIntlLocale(lang), { month: "short", year: "numeric", timeZone: "UTC" });
  const tile = (label: string, value: string, hint?: string) => (
    <Card key={label} className="flex flex-col gap-1 p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-numbers text-xl font-bold">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      {sections.includes("revenue") && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t("summary")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {tile(t("revenue"), sar(report.totals.revenue))}
            {tile(t("expenses"), sar(report.totals.expenses))}
            {tile(t("profit"), sar(report.totals.profit))}
          </div>
        </section>
      )}

      {sections.includes("unit") && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">{t("unitEconomics")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {tile(t("mrr"), sar(report.unit.mrr), report.unit.mrrGrowth === null ? undefined : t("vsLastMonth", { value: pct(report.unit.mrrGrowth) }))}
            {tile(t("customers"), formatNumber(report.unit.customers, lang))}
            {tile(t("arpu"), report.unit.arpu === null ? "—" : sar(report.unit.arpu), t("perMonth"))}
            {tile(t("churn"), pct(report.unit.churn), t("monthlyAvg"))}
            {tile(t("ltv"), report.unit.ltv === null ? "—" : sar(report.unit.ltv))}
            {tile(t("cac"), report.unit.cac === null ? "—" : sar(report.unit.cac))}
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
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  {["month", "revenue", "expenses", "profit", "mrr", "customers"].map((h) => (
                    <th key={h} scope="col" className={`p-3 font-medium ${h === "month" ? "text-start" : "text-end"}`}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.months.map((r) => (
                  <tr key={r.month} className="border-b border-line last:border-0">
                    <th scope="row" className="p-3 text-start font-medium">{month.format(new Date(`${r.month}-01T00:00:00Z`))}</th>
                    <td className="p-3 text-end">{sar(r.revenue)}</td>
                    <td className="p-3 text-end">{sar(r.expenses)}</td>
                    <td className={`p-3 text-end font-medium ${r.profit < 0 ? "text-bad" : ""}`}>{sar(r.profit)}</td>
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
