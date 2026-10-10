import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { CategoryEditor } from "./CategoryEditor";

/** Owner only: the category list creators pick from (Edit page). */
async function Editor() {
  await requireAdmin("owner");
  const categories = await db.category.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    select: { id: true, nameAr: true, nameEn: true, _count: { select: { pages: true } } },
  });
  return <CategoryEditor initial={categories.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, uses: c._count.pages }))} />;
}

export default async function CategoriesPage({ params }: PageProps<"/[locale]/admin/categories">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("categories")} subtitle={(await getTranslations("Admin.sub"))("categories")} search={false} />
      <Suspense fallback={null}><Editor /></Suspense>
    </div>
  );
}
