import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { PublishCard } from "./PublishCard";

const empty = { fullName: "", specialty: "", bio: "", city: "", country: "" };

async function Editor() {
  const { page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const translations = await db.pageTranslation.findMany({ where: { pageId: page.id } });
  const texts = Object.fromEntries(
    (["ar", "en"] as Locale[]).map((lang) => {
      const tr = translations.find((x) => x.lang === lang);
      return [lang, tr ? { fullName: tr.fullName, specialty: tr.specialty, bio: tr.bio, city: tr.city, country: tr.country } : empty];
    }),
  ) as Record<Locale, typeof empty>;

  return (
    <div className="flex flex-col gap-4">
      <PublishCard username={page.username} published={page.isPublished} />
      <ProfileForm primaryLang={page.primaryLang as Locale} enEnabled={page.enEnabled} texts={texts} />
    </div>
  );
}

export default async function EditPage({ params }: PageProps<"/[locale]/dashboard/edit">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("edit")}</h1>
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
