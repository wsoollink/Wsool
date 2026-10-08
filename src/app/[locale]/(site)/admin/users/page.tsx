import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { hasPro } from "@/config/plans";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { planLabel } from "./plan";

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Results({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  await requireAdmin("users.view");
  const t = await getTranslations("Admin.users");
  const q = String((await searchParams).q ?? "").trim().toLowerCase().slice(0, 100);
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { page: { username: { contains: q } } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, email: true, createdAt: true, suspendedAt: true, page: { select: { username: true, isPublished: true } }, subscription: { select: { status: true, trialEndsAt: true } } },
  });
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });

  if (users.length === 0) return <Card><p className="text-sm text-muted">{t("noResults")}</p></Card>;
  return (
    <ul className="flex flex-col gap-2">
      {users.map((u) => (
        <li key={u.id}>
          <Link href={`/admin/users/${u.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-card p-4 hover:border-blue">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium" dir="ltr">{u.page ? `/${u.page.username}` : t("noPage")}</span>
              <span className="block truncate text-sm text-muted" dir="ltr">{u.email}</span>
            </span>
            <span className="flex flex-wrap gap-2 text-xs">
              {u.suspendedAt && <span className="rounded-full bg-bad/10 px-2 py-1 font-semibold text-bad">{t("suspended")}</span>}
              <span className={`rounded-full px-2 py-1 font-semibold ${hasPro(u.subscription) ? "bg-blue/10 text-blue" : "bg-navy/5 text-muted"}`}>{t(`plan.${planLabel(u.subscription)}`)}</span>
              <span className="rounded-full bg-navy/5 px-2 py-1 text-muted">{date.format(u.createdAt)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function SearchBox({ searchParams, label }: { searchParams: SP; label: string }) {
  const q = String((await searchParams).q ?? "");
  return (
    <form role="search" className="flex gap-2">
      <label htmlFor="q" className="sr-only">{label}</label>
      <input id="q" name="q" type="search" dir="ltr" defaultValue={q} placeholder={label} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-base" />
      <button type="submit" aria-label={label} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-navy text-white"><Search aria-hidden="true" size={18} /></button>
    </form>
  );
}

export default async function UsersPage({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  const t = await getTranslations("Admin.users");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{nav("users")}</h1>
      <Suspense fallback={null}><SearchBox searchParams={searchParams} label={t("search")} /></Suspense>
      <Suspense fallback={null}><Results lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
