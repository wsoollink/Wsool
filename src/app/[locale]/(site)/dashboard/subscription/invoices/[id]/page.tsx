import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { InvoiceDocument } from "@/components/billing/InvoiceDocument";
import { SectionSkeleton } from "@/components/dashboard/SectionSkeleton";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, id: "_" }));
}

/** Printable tax invoice (VAT included) for one of the creator's own paid invoices. */
async function Invoice({ params, lang }: { params: Promise<{ id: string }>; lang: Locale }) {
  const { id } = await params;
  const { user } = await requireCreator();
  const t = await getTranslations("Billing.invoice");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const inv = await db.invoice.findFirst({ where: { id, userId: user.id, agencyId: null, number: { not: null } } });
  if (!inv) notFound();
  return <InvoiceDocument inv={inv} customer={user.email} line={t("line", { cycle: t(inv.cycle) })} lang={lang} />;
}

export default async function InvoicePage({ params }: PageProps<"/[locale]/dashboard/subscription/invoices/[id]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <Suspense fallback={<SectionSkeleton />}><Invoice params={params as Promise<{ id: string }>} lang={locale} /></Suspense>;
}
