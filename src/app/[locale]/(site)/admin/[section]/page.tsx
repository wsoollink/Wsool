import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { isLocale, locales, toIntlLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";

// Sections built in later phases (finance in phase 6).
const LATER = ["finance"] as const;

export function generateStaticParams() {
  return locales.flatMap((locale) => LATER.map((section) => ({ locale, section })));
}

async function Guard() {
  await requireAdmin("revenue.view");
  return null;
}

export default async function LaterSection({ params }: PageProps<"/[locale]/admin/[section]">) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !(LATER as readonly string[]).includes(section)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  const t = await getTranslations("Admin");
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}><Guard /></Suspense>
      <h1 className="text-2xl font-bold">{nav(section as (typeof LATER)[number])}</h1>
      <Card><p className="text-sm text-muted">{t(`later.${section as (typeof LATER)[number]}`)}</p></Card>
    </div>
  );
}
