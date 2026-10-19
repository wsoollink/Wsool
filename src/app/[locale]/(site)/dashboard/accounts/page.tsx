import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { AccountsCard } from "./AccountsCard";
import { AudienceCard, type AudienceValue } from "./AudienceCard";
import { ViewsCard } from "./ViewsCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionSkeleton } from "@/components/dashboard/SectionSkeleton";

/** Whole months between a stored month (first day, UTC) and this month. */
function monthsBetween(month: Date) {
  const now = new Date();
  return (now.getUTCFullYear() - month.getUTCFullYear()) * 12 + now.getUTCMonth() - month.getUTCMonth();
}

async function Editor({ lang }: { lang: Locale }) {
  const { user, page } = await requireCreator();
  const t = await getTranslations("AccountsPage");
  // Scoped to the creator's own page from the verified session.
  const [accounts, views, sub] = await Promise.all([
    db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, include: { audience: true } }),
    db.monthlyView.findFirst({ where: { pageId: page.id }, orderBy: { month: "desc" } }),
    db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } }),
  ]);
  const byAccount = (views?.byAccount ?? {}) as Record<string, number>;
  const viewsOf = (id: string) => (typeof byAccount[id] === "number" ? byAccount[id] : null);
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
        initial={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, followers: a.followers, verificationStatus: a.verificationStatus, link: a.url }))}
      />
      <ViewsCard
        // Remount when the list changes so the rows match the saved accounts.
        key={`views-${accounts.map((a) => a.id).join()}`}
        accounts={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, views: viewsOf(a.id) }))}
        initialMonthsAgo={views ? monthsBetween(views.month) : 0}
        monthLabels={[0, 1, 2].map((ago) => {
          const now = new Date();
          return new Intl.DateTimeFormat(toIntlLocale(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - ago, 1)));
        })}
      />
      <AudienceCard
        // Remount when the list changes so each form starts from saved data.
        key={accounts.map((a) => a.id).join()}
        accounts={accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, audience: audienceOf(a) }))}
        notice={!hasPro(sub) && !FREE_LIMITS.audience ? t("audienceProOnly") : undefined}
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
      <PageHeader title={t("accounts")} section="accounts" />
      <Suspense fallback={<SectionSkeleton />}>
        <Editor lang={locale} />
      </Suspense>
    </div>
  );
}
