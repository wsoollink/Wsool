import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CLAIM_COOKIE } from "@/components/marketing/content";
import { Card } from "@/components/ui/Card";
import { normalizeUsername, usernameFormatError } from "@/config/usernames";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMembership } from "@/lib/agency";
import Link from "next/link";
import { UsernameForm } from "./UsernameForm";

// Creators who already have a page skip this step.
async function RedirectIfClaimed() {
  const user = await requireUser();
  const [page, team] = await Promise.all([
    db.page.findUnique({ where: { userId: user.id }, select: { id: true } }),
    getMembership(user).catch(() => null),
  ]);
  if (page) redirect("/dashboard");
  const t = await getTranslations("Onboarding");
  // The name a visitor picked on the home page before signing in.
  const claimed = normalizeUsername((await cookies()).get(CLAIM_COOKIE)?.value ?? "");
  return (
    <>
      {/* Agency / brand team members: this page is personal, their work lives in the agency dashboard. */}
      {team && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue/25 bg-blue/5 p-4">
          <p className="font-bold">{t("teamTitle", { agency: team.agency.name })}</p>
          <p className="text-sm leading-6 text-muted">{t("teamBody")}</p>
          <Link href="/agency" className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-blue px-5 text-sm font-bold text-on-blue">{t("teamOpen")}</Link>
        </div>
      )}
      <UsernameForm initial={claimed && !usernameFormatError(claimed) ? claimed : undefined} />
    </>
  );
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
