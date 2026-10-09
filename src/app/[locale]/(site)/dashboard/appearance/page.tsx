import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseCustomColors } from "@/components/creator/theme";
import { FREE_LIMITS, hasPro } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { AppearanceEditor } from "./AppearanceEditor";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ACCENT_SWATCHES } from "@/lib/validation/appearance";

async function Editor() {
  const { user, page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [sub, tr, accounts] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } }),
    db.pageTranslation.findUnique({ where: { pageId_lang: { pageId: page.id, lang: page.primaryLang } }, select: { fullName: true, specialty: true } }),
    db.socialAccount.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" }, select: { platform: true, followers: true } }),
  ]);
  const isPro = hasPro(sub);

  return (
    <AppearanceEditor
      isPro={isPro}
      freeTemplates={FREE_LIMITS.templates}
      initial={{
        template: page.template,
        customColors: parseCustomColors(page.customColors) ?? { colors: ["#0060e6"], mode: "light" },
        // Accents are presets now; an older free-picked color starts as "template color".
        accent: ACCENT_SWATCHES.some((sw) => sw.light === page.accent) ? page.accent : null,
        numberFont: page.numberFont,
        hideBranding: page.hideBranding,
      }}
      preview={{
        name: tr?.fullName ?? "",
        specialty: tr?.specialty ?? "",
        photoUrl: page.photoUrl,
        followers: accounts.reduce((sum, a) => sum + a.followers, 0),
        accounts,
        lang: page.primaryLang as Locale,
      }}
    />
  );
}

export default async function AppearancePage({ params }: PageProps<"/[locale]/dashboard/appearance">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("appearance")} section="appearance" />
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
