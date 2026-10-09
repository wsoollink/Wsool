import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { audienceCounts, remainingFor } from "@/lib/newsletter-campaign";
import { CampaignEditor } from "./CampaignEditor";

// A placeholder id lets the page shell prerender; the real id is read inside Suspense.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale, id: "_" }));
}

async function Campaign({ lang, params }: { lang: Locale; params: Promise<{ id: string }> }) {
  const admin = await requireAdmin("newsletter.send");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await db.newsletterCampaign.findUnique({ where: { id } });
  if (!c) notFound();
  const [counts, remaining] = await Promise.all([audienceCounts(), remainingFor(c.id)]);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  return (
    <CampaignEditor
      id={c.id}
      status={c.status}
      initial={{ subjectAr: c.subjectAr, bodyAr: c.bodyAr, subjectEn: c.subjectEn, bodyEn: c.bodyEn, ctaLabelAr: c.ctaLabelAr, ctaLabelEn: c.ctaLabelEn, ctaUrl: c.ctaUrl }}
      audience={counts}
      progress={{ sent: c.sentCount, failed: c.failedCount, remaining }}
      sentOn={c.sentAt ? date.format(c.sentAt) : null}
      adminEmail={admin.email}
    />
  );
}

export default async function CampaignPage({ params }: PageProps<"/[locale]/admin/newsletter/[id]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  const t = await getTranslations("Admin.newsletter");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/newsletter" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-blue">{t("back")}</Link>
      <AdminHeader title={nav("newsletter")} search={false} />
      <Suspense fallback={null}><Campaign lang={locale} params={params as Promise<{ id: string }>} /></Suspense>
    </div>
  );
}
