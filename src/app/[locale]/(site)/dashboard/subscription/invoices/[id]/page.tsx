import { Suspense } from "react";
import { vatPart } from "@/config/plans";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { SELLER } from "@/config/site";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { invoiceLabel } from "@/lib/billing";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, id: "_" }));
}

/** Printable tax invoice (VAT included) for one of the creator's own paid invoices. */
async function Invoice({ params, lang }: { params: Promise<{ id: string }>; lang: Locale }) {
  const { id } = await params;
  const { user } = await requireCreator();
  const t = await getTranslations("Billing.invoice");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const inv = await db.invoice.findFirst({ where: { id, userId: user.id, number: { not: null } } });
  if (!inv) notFound();
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "long" });
  const money = (v: number) => formatPrice(v, inv.currency, lang);
  const total = Number(inv.amount), vat = Number(inv.vatAmount);
  // Prices include VAT; a discount is shown before VAT: full line, minus the discount, = subtotal.
  const discount = Number(inv.discountAmount);
  const subtotal = Math.round((total - vat) * 100) / 100;
  const lineEx = discount ? Math.round((total + discount - vatPart(total + discount)) * 100) / 100 : subtotal;

  return (
    <Card className="flex flex-col gap-6 print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted" dir="ltr">{invoiceLabel(inv.number)}</p>
        </div>
        <PrintButton label={t("print")} />
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted">{t("seller")}</dt><dd className="font-medium">{lang === "en" ? SELLER.nameEn : SELLER.name}</dd>
          {SELLER.vatNumber && <dd className="text-muted">{t("vatNumber")}: <span dir="ltr">{SELLER.vatNumber}</span></dd>}
          {SELLER.crNumber && <dd className="text-muted">{t("crNumber")}: <span dir="ltr">{SELLER.crNumber}</span></dd>}
          {SELLER.address && <dd className="text-muted">{SELLER.address}</dd>}
        </div>
        <div><dt className="text-xs text-muted">{t("customer")}</dt><dd className="font-medium" dir="ltr">{user.email}</dd></div>
        <div><dt className="text-xs text-muted">{t("date")}</dt><dd>{date.format(inv.paidAt ?? inv.createdAt)}</dd></div>
        {inv.periodStart && inv.periodEnd && <div><dt className="text-xs text-muted">{t("period")}</dt><dd>{date.format(inv.periodStart)} – {date.format(inv.periodEnd)}</dd></div>}
      </dl>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-xs text-muted"><th scope="col" className="py-2 text-start font-medium">{t("item")}</th><th scope="col" className="py-2 text-end font-medium">{t("amount")}</th></tr></thead>
        <tbody>
          <tr className="border-b border-line"><td className="py-3">{t("line", { cycle: t(inv.cycle) })}</td><td className="py-3 text-end">{money(lineEx)}</td></tr>
          {discount > 0 && <tr className="border-b border-line"><td className="py-3">{t("discount")}</td><td className="py-3 text-end text-good">−{money(Math.round((lineEx - subtotal) * 100) / 100)}</td></tr>}
          <tr><td className="py-2 text-muted">{t("subtotal")}</td><td className="py-2 text-end">{money(subtotal)}</td></tr>
          <tr><td className="py-2 text-muted">{t("vat")}</td><td className="py-2 text-end">{money(vat)}</td></tr>
          <tr className="border-t border-line font-bold"><td className="py-3">{t("total")}</td><td className="py-3 text-end">{money(total)}</td></tr>
        </tbody>
      </table>
      {inv.status === "refunded" && <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">{t("refunded")}</p>}
    </Card>
  );
}

export default async function InvoicePage({ params }: PageProps<"/[locale]/dashboard/subscription/invoices/[id]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <Suspense fallback={null}><Invoice params={params as Promise<{ id: string }>} lang={locale} /></Suspense>;
}
