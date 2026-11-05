import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InvoiceDocument } from "@/components/billing/InvoiceDocument";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAgency } from "@/lib/agency";
import { db } from "@/lib/db";

export const metadata: Metadata = { robots: { index: false } };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, id: "_" }));
}

/** Printable tax invoice for one of the agency's paid plan invoices (owners and managers). */
async function AgencyInvoice({ params, lang }: { params: Promise<{ id: string }>; lang: Locale }) {
  const { id } = await params;
  const m = await requireAgency("manager");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const inv = await db.invoice.findFirst({ where: { id, agencyId: m.agency.id, number: { not: null } } });
  if (!inv) notFound();
  const [t, tb] = await Promise.all([getTranslations("Billing.invoice"), getTranslations("AgencyBilling")]);
  const payer = await db.user.findUnique({ where: { id: inv.userId }, select: { email: true } });
  const plan = inv.agencyPlan ? tb(`plan.${inv.agencyPlan}`) : "";
  return (
    <div className="flex flex-col gap-4">
      <Link href="/agency?tab=billing" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-blue print:hidden">{tb("backToBilling")}</Link>
      <InvoiceDocument inv={inv} customer={[m.agency.name, payer?.email].filter(Boolean).join(" · ")} line={tb("invoiceLine", { plan, cycle: t(inv.cycle) })} lang={lang} />
    </div>
  );
}

export default async function AgencyInvoicePage({ params }: PageProps<"/[locale]/agency/invoices/[id]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Suspense fallback={null}><AgencyInvoice params={params as Promise<{ id: string }>} lang={locale} /></Suspense>
    </main>
  );
}
