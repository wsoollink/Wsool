import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { getAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { paymentProvider } from "@/lib/payments";
import { MockButtons } from "./MockButtons";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, invoiceId: "_" }));
}

/** Test payment page: lets the team try the whole flow without real money. */
async function Checkout({ params, lang }: { params: Promise<{ invoiceId: string }>; lang: Locale }) {
  const { invoiceId } = await params;
  const user = await requireUser();
  const t = await getTranslations("Billing.mock");
  if (paymentProvider()?.name !== "mock" || !/^[0-9a-f-]{36}$/.test(invoiceId)) notFound();
  const staff = await getAdmin();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  if (!invoice) notFound();
  if (!staff) return <p className="text-sm text-muted">{t("staffOnly")}</p>;
  if (invoice.status !== "pending") return <Link href="/dashboard/subscription" className="text-blue underline">{t("done")}</Link>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("amount")}</p>
      <p className="font-numbers text-4xl font-bold">{formatPrice(Number(invoice.amount), invoice.currency, lang)}</p>
      <MockButtons
        invoiceId={invoice.id}
        choices={[
          { outcome: "paid", card: "ok", label: t("payOk"), variant: "primary" },
          { outcome: "paid", card: "fail", label: t("payRenewFails"), variant: "secondary" },
          { outcome: "failed", card: "ok", label: t("decline"), variant: "secondary", danger: true },
        ]}
      />
    </div>
  );
}

export default async function MockCheckoutPage({ params }: PageProps<"/[locale]/billing/mock/[invoiceId]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Billing.mock");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Card className="flex flex-col gap-5 p-6">
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-warn/10 px-3 py-1 text-xs font-semibold text-warn">
          <FlaskConical aria-hidden="true" size={14} /> {t("badge")}
        </p>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Suspense fallback={null}>
          <Checkout params={params as Promise<{ invoiceId: string }>} lang={locale} />
        </Suspense>
      </Card>
    </main>
  );
}
