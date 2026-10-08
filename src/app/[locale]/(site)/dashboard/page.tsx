import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { trialDaysLeft } from "@/config/plans";
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
        {subscription?.status === "trialing" && (
          <p className="rounded-xl bg-blue/10 px-4 py-3 text-sm text-blue">{t("trial", { days: daysLeft })}</p>
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
