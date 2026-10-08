import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UsernameForm } from "./UsernameForm";

// Creators who already have a page skip this step.
async function RedirectIfClaimed() {
  const user = await requireUser();
  const page = await db.page.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (page) redirect("/dashboard");
  return <UsernameForm />;
}

export default async function OnboardingPage({ params }: PageProps<"/[locale]/onboarding">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Onboarding");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <Suspense fallback={null}>
          <RedirectIfClaimed />
        </Suspense>
      </Card>
    </main>
  );
}
