import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { AcademyButtons } from "./Buttons";

/** Academy articles (drafts, scheduled, published), both languages, newest first. */
async function Articles({ lang }: { lang: Locale }) {
  await requireAdmin("academy.edit");
  const t = await getTranslations("Admin.academy");
  const articles = await db.article.findMany({ orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, lang: true, slug: true, title: true, publishedAt: true, updatedAt: true } });
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  const now = new Date();
  return (
    <div className="flex flex-col gap-4">
      <AcademyButtons labels={{ newAr: t("newAr"), newEn: t("newEn"), starters: t("starters"), added: t.raw("added") as string }} />
      <Card className="flex flex-col gap-1 p-2">
        {articles.length === 0 ? (
          <p className="p-3 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col">
            {articles.map((a) => {
              const state = !a.publishedAt ? "draft" : a.publishedAt > now ? "scheduled" : "published";
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] px-3 py-2 hover:bg-navy/[0.03]">
                  <Link href={`/admin/academy/edit?id=${a.id}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm font-bold">
                    <span className="rounded-md bg-navy/5 px-1.5 py-0.5 text-[11px] font-bold uppercase text-muted">{a.lang}</span>
                    <span dir="auto" className="truncate">{a.title || t("untitled")}</span>
                  </Link>
                  <Pill tone={state === "published" ? "good" : state === "scheduled" ? "blue" : "grey"}>{t(`state.${state}`)}</Pill>
                  <span className="text-xs text-muted">{state === "scheduled" ? t("on", { date: date.format(a.publishedAt!) }) : date.format(a.updatedAt)}</span>
                  {state === "published" && (
                    <a href={`/academy/${a.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-navy/5" aria-label={t("view")}><ExternalLink aria-hidden="true" size={16} /></a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default async function AcademyAdminPage({ params }: PageProps<"/[locale]/admin/academy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  const sub = await getTranslations("Admin.sub");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("academy")} subtitle={sub("academy")} />
      <Suspense fallback={null}><Articles lang={locale} /></Suspense>
    </div>
  );
}
