import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { pageLanguages } from "@/lib/page-language";
import { LicensesCard } from "./LicensesCard";
import { PhotoCard } from "./PhotoCard";
import { PublishCard } from "./PublishCard";
import { TagsCard } from "./TagsCard";
import { PageHeader } from "@/components/dashboard/PageHeader";

const empty = { fullName: "", specialty: "", bio: "", city: "", country: "" };

async function Editor() {
  const { page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [translations, tags, licenses] = await Promise.all([
    db.pageTranslation.findMany({ where: { pageId: page.id } }),
    db.tag.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    db.license.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
  ]);
  const langs = pageLanguages(page.primaryLang as Locale, page.enEnabled);
  const texts = Object.fromEntries(
    (["ar", "en"] as Locale[]).map((lang) => {
      const tr = translations.find((x) => x.lang === lang);
      return [lang, tr ? { fullName: tr.fullName, specialty: tr.specialty, bio: tr.bio, city: tr.city, country: tr.country } : empty];
    }),
  ) as Record<Locale, typeof empty>;

  return (
    <div className="flex flex-col gap-4">
      <PublishCard username={page.username} published={page.isPublished} />
      <PhotoCard photoUrl={page.photoUrl} />
      <ProfileForm primaryLang={page.primaryLang as Locale} enEnabled={page.enEnabled} texts={texts} />
      <TagsCard
        langs={langs}
        initial={{ ar: tags.filter((x) => x.lang === "ar").map((x) => x.label), en: tags.filter((x) => x.lang === "en").map((x) => x.label) }}
      />
      <LicensesCard
        showEnglish={langs.includes("en") && page.primaryLang === "ar"}
        initial={licenses.map((l) => ({ name: l.name, nameEn: l.nameEn ?? "", number: l.number, fileUrl: l.fileUrl }))}
      />
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
      <PageHeader title={t("edit")} section="edit" />
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
