import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionSkeleton } from "@/components/dashboard/SectionSkeleton";
import { Card, Panel } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { UNLINK_GRACE_DAYS } from "@/lib/agency";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { ActiveAgency, InviteCard } from "./AgencyCards";

/** The creator's side of agencies: invites, the active agency's permissions, its recent changes, unlinking. */
async function AgencySection({ lang }: { lang: Locale }) {
  // Unscoped: an agency acting for this creator can never open this section.
  const { page } = await requireCreator();
  const t = await getTranslations("AgencySection");
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  const dateTime = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  const links = await db.agencyLink.findMany({
    where: { pageId: page.id, status: { in: ["pending", "active"] }, agency: { status: "active" } },
    include: { agency: { select: { name: true } } },
    orderBy: { invitedAt: "desc" },
  });
  const active = links.find((l) => l.status === "active");
  const invites = active ? [] : links.filter((l) => l.status === "pending");
  const activity = active
    ? await db.agencyActivity.findMany({ where: { pageId: page.id, agencyId: active.agencyId }, orderBy: { createdAt: "desc" }, take: 15 })
    : [];
  const people = activity.length
    ? new Map((await db.agencyMember.findMany({ where: { agencyId: active!.agencyId, userId: { in: [...new Set(activity.map((a) => a.userId))] } }, select: { userId: true, email: true } })).map((m) => [m.userId, m.email]))
    : new Map<string | null, string>();

  if (!active && invites.length === 0) {
    return (
      <Card className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-muted"><Building2 aria-hidden="true" size={20} /></span>
        <div>
          <h2 className="font-bold">{t("emptyTitle")}</h2>
          <p className="text-sm leading-6 text-muted">{t("emptyBody")}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-4">
        {invites.map((l) => (
          <InviteCard key={l.id} linkId={l.id} agency={l.agency.name} requested={{ content: l.canContent, rates: l.canRates, contact: l.canContact }} />
        ))}
        {active && (
          <Panel title={t("activeTitle", { agency: active.agency.name })} aside={active.decidedAt ? t("since", { date: date.format(active.decidedAt) }) : undefined}>
            <ActiveAgency agency={active.agency.name} initial={{ content: active.canContent, rates: active.canRates, contact: active.canContact }} graceDays={UNLINK_GRACE_DAYS} />
          </Panel>
        )}
      </div>
      {active && (
        <Panel title={t("activityTitle")} flush>
          {activity.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("noActivity")}</p>
          ) : (
            <ol className="divide-y divide-line-soft">
              {activity.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="text-sm">
                    <bdi dir="ltr" className="font-bold">{people.get(a.userId) ?? "—"}</bdi>{" "}
                    {t("edited", { section: t.has(`section.${a.section}` as never) ? t(`section.${a.section}` as never) : a.section })}
                  </p>
                  <p className="text-xs text-muted">{dateTime.format(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}
    </div>
  );
}

export default async function AgencySectionPage({ params }: PageProps<"/[locale]/dashboard/agency">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={nav("agency")} section="agency" />
      <Suspense fallback={<SectionSkeleton />}><AgencySection lang={locale} /></Suspense>
    </div>
  );
}
