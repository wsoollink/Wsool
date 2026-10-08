import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui/Card";
import { trialDaysLeft } from "@/config/plans";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "../login/actions";

// Placeholder: the real dashboard shell is built in Phase 1, step 7.
async function Account() {
  const user = await requireUser();
  const t = await getTranslations("Dashboard");
  // Scoped to the signed-in user's id from the verified session.
  const subscription = await db.subscription.findUnique({ where: { userId: user.id } });
  const daysLeft = trialDaysLeft(subscription?.trialEndsAt);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">{t("welcome")}</h1>
      <p className="text-sm text-muted">
        {t("signedInAs")} <span dir="ltr" className="font-medium text-navy">{user.email}</span>
      </p>
      {subscription?.status === "trialing" && (
        <p className="rounded-xl bg-blue/10 px-4 py-3 text-sm text-blue">{t("trial", { days: daysLeft })}</p>
      )}
      <form action={signOut}>
        <SubmitButton variant="secondary" className="w-full" pendingText={t("signingOut")}>
          {t("signOut")}
        </SubmitButton>
      </form>
    </Card>
  );
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Suspense fallback={null}>
        <Account />
      </Suspense>
    </main>
  );
}
