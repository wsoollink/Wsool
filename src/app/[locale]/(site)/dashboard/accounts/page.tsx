import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { AccountsCard } from "./AccountsCard";
import { AudienceCard, type AudienceValue } from "./AudienceCard";
import { ViewsCard } from "./ViewsCard";

async function Editor() {
  const { page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [accounts, views] = await Promise.all([
    db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { audience: true } }),
    db.monthlyView.findFirst({ where: { pageId: page.id }, orderBy: { month: "desc" } }),
  ]);
  const audienceOf = (a: (typeof accounts)[number]): AudienceValue | null =>
    a.audience
      ? {
          gender: (a.audience.gender ?? []) as AudienceValue["gender"],
          ages: (a.audience.ages ?? []) as AudienceValue["ages"],
          countries: (a.audience.countries ?? []) as AudienceValue["countries"],
          cities: (a.audience.cities ?? []) as AudienceValue["cities"],
        }
      : null;

  return (
    <div className="flex flex-col gap-4">
      <AccountsCard
        initial={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, followers: a.followers, verificationStatus: a.verificationStatus }))}
      />
      <ViewsCard initial={views ? Number(views.views) : null} />
      <AudienceCard
        // Remount when the list changes so each form starts from saved data.
        key={accounts.map((a) => a.id).join()}
        accounts={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, audience: audienceOf(a) }))}
      />
    </div>
  );
}

export default async function AccountsPage({ params }: PageProps<"/[locale]/dashboard/accounts">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("accounts")}</h1>
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
