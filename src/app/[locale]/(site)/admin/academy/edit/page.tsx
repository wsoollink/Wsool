import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { ACADEMY_CATEGORIES, type AcademyCategory } from "@/lib/academy";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { ArticleEditor } from "./ArticleEditor";

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Editor({ searchParams }: { searchParams: SP }) {
  await requireAdmin("academy.edit");
  const id = (await searchParams).id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const a = await db.article.findUnique({ where: { id } });
  if (!a) notFound();
  const category = (ACADEMY_CATEGORIES as readonly string[]).includes(a.category) ? (a.category as AcademyCategory) : "pricing";
  return (
    <ArticleEditor
      id={a.id}
      initial={{ lang: a.lang, slug: a.slug.startsWith("draft-") ? "" : a.slug, title: a.title, summary: a.summary, body: a.body, category, coverUrl: a.coverUrl }}
      draftSlug={a.slug}
      publishedAt={a.publishedAt?.toISOString() ?? null}
    />
  );
}

export default async function ArticleEditPage({ params, searchParams }: PageProps<"/[locale]/admin/academy/edit">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  const t = await getTranslations("Admin.academy");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/academy" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-blue">{t("back")}</Link>
      <AdminHeader title={nav("academy")} />
      <Suspense fallback={null}><Editor searchParams={searchParams} /></Suspense>
    </div>
  );
}
