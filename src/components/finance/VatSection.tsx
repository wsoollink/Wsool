import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { buttonClasses } from "@/components/ui/Button";
import { toIntlLocale, type Locale } from "@/i18n/config";
import type { VatReport, VatRow } from "@/lib/vat";
import { formatNumber, formatPrice } from "@/lib/format";

/** Admin Finance: VAT collected and owed to ZATCA (current quarter, per quarter, per month) + CSV for the accountant. */
export async function VatSection({ report, months, lang }: { report: VatReport; months: number; lang: Locale }) {
  const t = await getTranslations("Finance.vat");
  const sar = (v: number) => formatPrice(v, "SAR", lang);
  const month = new Intl.DateTimeFormat(toIntlLocale(lang), { month: "short", year: "numeric", timeZone: "UTC" });
  const quarterLabel = (key: string) => t("quarter", { q: key.slice(-1), year: key.slice(0, 4) });
  const c = report.current;

  const table = (rows: VatRow[], label: (key: string) => string, title: string) => (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="p-3 text-start text-sm font-bold">{title}</caption>
        <thead className="bg-bg text-[11.5px] text-muted">
          <tr className="border-y border-navy/6">
            {["period", "sales", "net", "vat", "refundVat", "due", "invoices"].map((h) => (
              <th key={h} scope="col" className={`p-3 font-medium ${h === "period" ? "text-start" : "text-end"}`}>{t(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-navy/6 last:border-0">
              <th scope="row" className="whitespace-nowrap p-3 text-start font-medium">{label(r.key)}</th>
              <td className="p-3 text-end">{sar(r.sales)}</td>
              <td className="p-3 text-end">{sar(r.net)}</td>
              <td className="p-3 text-end">{sar(r.vat)}</td>
              <td className="p-3 text-end">{sar(-r.refundVat || 0)}</td>
              <td className="p-3 text-end font-bold">{sar(r.due)}</td>
              <td className="p-3 text-end">{formatNumber(r.invoices, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  return (
    <section aria-labelledby="vat-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="vat-title" className="font-bold">{t("title", { quarter: quarterLabel(c.key) })}</h2>
        <a href={`/api/admin/vat?months=${months}`} className={buttonClasses("secondary", "gap-2 print:hidden")}>
          <Download aria-hidden="true" size={16} /> {t("export")}
        </a>
      </div>
      <KpiStrip columns={4} items={[
        { label: t("sales"), value: sar(c.sales), note: t("invoicesCount", { n: c.invoices }) },
        { label: t("net"), value: sar(c.net) },
        { label: t("vat"), value: sar(c.vat), note: c.refundVat ? t("minusRefunds", { amount: sar(c.refundVat) }) : undefined },
        { label: t("due"), value: sar(c.due), valueTone: c.due > 0 ? "warn" : undefined, note: t("dueHint") },
      ]} />
      {table(report.quarters, quarterLabel, t("byQuarter"))}
      {table(report.months, (k) => month.format(new Date(`${k}-01T00:00:00Z`)), t("byMonth"))}
      <p className="text-xs text-muted">{t("note")}</p>
    </section>
  );
}
