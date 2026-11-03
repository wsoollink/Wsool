import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AgencyProfile } from "@/components/agency-page/AgencyProfile";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAgency } from "@/lib/agency";
import { getAgencyPreview } from "@/lib/agency-page";

export const metadata: Metadata = { robots: { index: false } };

/** The agency's own preview of its public page (team only; works while unpublished, always fresh data). */
async function Preview({ lang }: { lang: Locale }) {
  const m = await requireAgency("viewer");
  if (!m.agency.slug) notFound();
  const agency = await getAgencyPreview(m.agency.slug, lang);
  if (!agency) notFound();
  return <AgencyProfile agency={agency} lang={lang} preview={!m.agency.pagePublished} />;
}

export default async function AgencyPreviewPage({ params }: PageProps<"/[locale]/agency/preview">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return (
    <Suspense fallback={null}>
      <Preview lang={locale} />
    </Suspense>
  );
}
