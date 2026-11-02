import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FlaskConical, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { getAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { paymentProvider } from "@/lib/payments";
import { moyasarPublishableKey } from "@/lib/payments/moyasar";
import { MoyasarForm } from "./MoyasarForm";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, invoiceId: "_" }));
}

/** Pay a pending invoice with Moyasar's form. Only the invoice's owner; test keys = staff only. */
async function Checkout({ params, lang }: { params: Promise<{ invoiceId: string }>; lang: Locale }) {
  const { invoiceId } = await params;
  const user = await requireUser();
  const t = await getTranslations("Checkout");
  const provider = paymentProvider();
  if (provider?.name !== "moyasar" || !/^[0-9a-f-]{36}$/.test(invoiceId)) notFound();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  if (!invoice) notFound();
  if (provider.testOnly && !(await getAdmin())) return <p className="text-sm text-muted">{t("staffOnly")}</p>;
  if (invoice.status !== "pending") return <Link href="/dashboard/subscription" className="text-blue underline">{t("done")}</Link>;
  const amount = Number(invoice.amount);

  return (
    <div className="flex flex-col gap-5">
      {provider.testOnly && (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-warn/10 px-3 py-1 text-xs font-semibold text-warn">
          <FlaskConical aria-hidden="true" size={14} /> {t("testMode")}
        </p>
      )}
      <div className="flex items-end justify-between gap-3 border-b border-line-soft pb-4">
        <div>
          <p className="text-sm text-muted">{t("plan", { cycle: t(`cycle.${invoice.cycle}`) })}</p>
          {Number(invoice.discountAmount) > 0 && <p className="text-xs text-good">{t("discounted")}</p>}
        </div>
        <p className="font-numbers text-3xl font-bold">{formatPrice(amount, invoice.currency, lang)}</p>
      </div>
      <MoyasarForm
        invoiceId={invoice.id} amount={amount} currency={invoice.currency} lang={lang}
        description={`Wsool Pro (${invoice.cycle})`} publishableKey={moyasarPublishableKey()} errorText={t("loadError")}
      />
      <p className="flex gap-2 text-xs leading-relaxed text-muted">
        <Lock aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
        <span>
          {t("saveNote")}{" "}
          {t.rich("refund", { link: (c) => <Link href="/refund" className="text-blue underline underline-offset-2">{c}</Link> })}
        </span>
      </p>
      <Link href="/dashboard/subscription" className="self-center text-sm font-semibold text-muted hover:text-navy">{t("back")}</Link>
    </div>
  );
}

export default async function PayPage({ params }: PageProps<"/[locale]/billing/pay/[invoiceId]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Checkout");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Card className="flex flex-col gap-5 p-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Suspense fallback={null}>
          <Checkout params={params as Promise<{ invoiceId: string }>} lang={locale} />
        </Suspense>
      </Card>
    </main>
  );
}
