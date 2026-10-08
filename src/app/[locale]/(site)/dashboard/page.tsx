import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { FREE_LIMITS, hasPro, trialDaysLeft } from "@/config/plans";
import { pageLanguages } from "@/lib/page-language";
import type { Locale } from "@/i18n/config";
import { FileDown } from "lucide-react";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";

// Dashboard home. Real widgets (views, clicks, checklist) come in later phases.
async function Home() {
  const { user, page } = await requireCreator();
  const t = await getTranslations("Dashboard");
  // Scoped to the signed-in user's id from the verified session.
  const subscription = await db.subscription.findUnique({ where: { userId: user.id } });
  const daysLeft = trialDaysLeft(subscription?.trialEndsAt);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("welcome")}</h1>
      <Card className="flex flex-col gap-3">
        <p className="text-sm">
          {t("yourLink")}{" "}
          <span dir="ltr" className="inline-block break-all font-medium text-blue">wsool.link/{page.username}</span>
        </p>
        <p className="text-sm text-muted">
          {t("signedInAs")} <span dir="ltr" className="inline-block break-all text-navy">{user.email}</span>
        </p>
        {page.deletedAt && (
          <Link href="/dashboard/subscription" className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad underline">{t("deletionScheduled")}</Link>
        )}
        {page.isPublished && (hasPro(subscription) || FREE_LIMITS.pdf) ? (
          <div className="flex flex-wrap gap-2">
            {pageLanguages(page.primaryLang as Locale, page.enEnabled).map((lang) => (
              <a key={lang} href={`/${page.username}/pdf?lang=${lang}&download`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-navy/5">
                <FileDown aria-hidden="true" size={18} /> {t("downloadPdf", { lang })}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{page.isPublished ? t("pdfPro") : t("pdfPublishFirst")}</p>
        )}
        {subscription?.status === "trialing" && daysLeft > 0 && (
          <Link href="/dashboard/subscription" className="rounded-xl bg-blue/10 px-4 py-3 text-sm text-blue">{t("trial", { days: daysLeft })} <span className="underline">{t("subscribe")}</span></Link>
        )}
      </Card>
    </div>
  );
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));

  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}
