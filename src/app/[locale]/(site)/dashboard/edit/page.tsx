import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { pageLanguages } from "@/lib/page-language";
import { listCategories } from "@/lib/categories";
import { CategoriesCard } from "./CategoriesCard";
import { LicensesCard } from "./LicensesCard";
import { LogoCard } from "./LogoCard";
import { PagePreview } from "./PagePreview";
import { PhotoCard } from "./PhotoCard";
import { PublishCard } from "./PublishCard";
import { TagsCard } from "./TagsCard";
import { PageHeader } from "@/components/dashboard/PageHeader";

const empty = { fullName: "", specialty: "", bio: "", city: "", country: "" };

async function Editor() {
  const { page } = await requireCreator();
  // Scoped to the creator's own page from the verified session.
  const [translations, tags, licenses, categories, picked] = await Promise.all([
    db.pageTranslation.findMany({ where: { pageId: page.id } }),
    db.tag.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    db.license.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
    listCategories(),
    db.pageCategory.findMany({ where: { pageId: page.id }, select: { categoryId: true } }),
  ]);
  const langs = pageLanguages(page.primaryLang as Locale, page.enEnabled);
  const texts = Object.fromEntries(
    (["ar", "en"] as Locale[]).map((lang) => {
      const tr = translations.find((x) => x.lang === lang);
      return [lang, tr ? { fullName: tr.fullName, specialty: tr.specialty, bio: tr.bio, city: tr.city, country: tr.country } : empty];
    }),
  ) as Record<Locale, typeof empty>;

  return (
    // Desktop: cards + sticky preview of the real page beside them.
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <PagePreview username={page.username} langs={langs} />
    <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
      <PublishCard username={page.username} published={page.isPublished} />
      <PhotoCard photoUrl={page.photoUrl} />
      <LogoCard logoUrl={page.logoUrl} />
      <ProfileForm primaryLang={page.primaryLang as Locale} enEnabled={page.enEnabled} texts={texts} />
      <CategoriesCard categories={categories} initial={picked.map((p) => p.categoryId)} />
      <TagsCard
        langs={langs}
        initial={{ ar: tags.filter((x) => x.lang === "ar").map((x) => x.label), en: tags.filter((x) => x.lang === "en").map((x) => x.label) }}
      />
      <LicensesCard
        showEnglish={langs.includes("en") && page.primaryLang === "ar"}
        initial={licenses.map((l) => ({ name: l.name, nameEn: l.nameEn ?? "", number: l.number, fileUrl: l.fileUrl }))}
      />
    </div>
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
