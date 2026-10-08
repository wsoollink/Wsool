import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { Card } from "@/components/ui/Card";
import { PLACEHOLDER_SECTIONS, type SectionKey } from "@/config/dashboard";
import { isLocale, locales, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";

// Temporary page for sections built in later phases. A real section gets its
// own folder (e.g. dashboard/accounts/), which takes priority over this route.
export function generateStaticParams() {
  return locales.flatMap((locale) => PLACEHOLDER_SECTIONS.map((section) => ({ locale, section })));
}

async function Guard() {
  await requireCreator();
  return null;
}

export default async function SectionPage({ params }: PageProps<"/[locale]/dashboard/[section]">) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !PLACEHOLDER_SECTIONS.includes(section as SectionKey)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("DashboardNav");
  const t = await getTranslations("Dashboard");

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <h1 className="text-2xl font-bold">{nav(section as SectionKey)}</h1>
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <SectionIcon section={section as SectionKey} size={32} className="text-blue" />
        <p className="text-muted">{t("comingSoon")}</p>
      </Card>
    </div>
  );
}
