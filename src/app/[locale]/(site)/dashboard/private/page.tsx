import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProNotice } from "@/components/dashboard/ProNotice";
import { SectionSkeleton } from "@/components/dashboard/SectionSkeleton";
import { Card } from "@/components/ui/Card";
import { hasPro } from "@/config/plans";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { listPrivateLinks, privateLinkUrl } from "@/lib/private-view";
import { siteOrigin } from "@/lib/site-url";
import { PAGE_SECTIONS } from "@/lib/validation/appearance";
import { PrivateEditor } from "./PrivateEditor";

async function Editor() {
  // Unscoped: the creator only, never an agency acting for them.
  const { user, page } = await requireCreator();
  const t = await getTranslations("PrivatePage");
  const tc = await getTranslations("CreatorPage");
  const [sub, links] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } }),
    listPrivateLinks(page.id),
  ]);
  const isPro = hasPro(sub);
  const origin = siteOrigin();
  const sections = page.lockWhole ? null : PAGE_SECTIONS.filter((s) => page.privateSections.includes(s) && !page.hiddenSections.includes(s));
  return (
    <div className="flex flex-col gap-4">
      {!isPro && <ProNotice text={t("proOnly")} />}
      <Card className="flex flex-col gap-2">
        <h2 className="font-bold">{t("whatTitle")}</h2>
        <p className="text-sm text-muted">
          {sections === null ? t("whatWhole") : sections.length ? t("whatSections", { list: sections.map((s) => tc(`privateSection.${s}`)).join(lang(page.primaryLang)) }) : t("whatNone")}
        </p>
        <Link href="/dashboard/appearance" className="self-start text-sm font-semibold text-blue">{t("chooseSections")}</Link>
      </Card>
      <PrivateEditor
        isPro={isPro}
        hasPassword={!!page.privatePassword}
        links={links.map((l) => ({
          id: l.id, name: l.name, url: privateLinkUrl(origin, page.username, l.tokenSealed), views: l.views,
          lastViewedAt: l.lastViewedAt?.toISOString() ?? null, expiresAt: l.expiresAt?.toISOString() ?? null,
          expired: l.expired,
        }))}
      />
    </div>
  );
}

const lang = (l: string) => (l === "en" ? ", " : "، ");

export default async function PrivatePage({ params }: PageProps<"/[locale]/dashboard/private">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("private")} section="private" />
      <Suspense fallback={<SectionSkeleton />}>
        <Editor />
      </Suspense>
    </div>
  );
}
