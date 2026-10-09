import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Search } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import type { Prisma } from "@/generated/prisma/client";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatCompact, formatNumber } from "@/lib/format";
import { planLabel } from "./plan";

type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = ["all", "paid", "trial", "free"] as const;
type Filter = (typeof FILTERS)[number];
const DAY = 86_400_000;

function filterWhere(filter: Filter, now: Date): Prisma.UserWhereInput {
  const paid: Prisma.SubscriptionWhereInput = { status: { in: ["active", "past_due"] } };
  const trial: Prisma.SubscriptionWhereInput = { status: "trialing", trialEndsAt: { gt: now } };
  if (filter === "paid") return { subscription: { is: paid } };
  if (filter === "trial") return { subscription: { is: trial } };
  if (filter === "free") return { NOT: [{ subscription: { is: paid } }, { subscription: { is: trial } }] };
  return {};
}

const pillTone = { pro: "bg-blue/10 text-blue", trial: "bg-warn/10 text-warn", free: "bg-navy/5 text-muted" };

/** Users table from the admin design: filters with counts, search, plan detail, followers, activity, status. */
async function Results({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  await requireAdmin("users.view");
  const t = await getTranslations("Admin.users");
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().toLowerCase().replace(/^@|^\//, "").slice(0, 100);
  const filter: Filter = FILTERS.includes(sp.f as Filter) ? (sp.f as Filter) : "all";
  const now = new Date();
  const search: Prisma.UserWhereInput = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { page: { username: { contains: q } } }, { page: { translations: { some: { fullName: { contains: q, mode: "insensitive" } } } } }] }
    : {};
  const [counts, users] = await Promise.all([
    Promise.all(FILTERS.map((f) => db.user.count({ where: { AND: [search, filterWhere(f, now)] } }))),
    db.user.findMany({
      where: { AND: [search, filterWhere(filter, now)] },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, email: true, createdAt: true, suspendedAt: true,
        page: { select: { username: true, isPublished: true, deletedAt: true, photoUrl: true, updatedAt: true, primaryLang: true, translations: { select: { lang: true, fullName: true } }, socialAccounts: { select: { followers: true } } } },
        subscription: { select: { status: true, trialEndsAt: true, cycle: true } },
      },
    }),
  ]);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  const ago = new Intl.RelativeTimeFormat(toIntlLocale(lang), { numeric: "auto" });
  const href = (f: Filter) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(f !== "all" ? { f } : {}) })}`;

  return (
    <>
      <nav aria-label={t("filters")} className="flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <Link
            key={f} href={href(f)} aria-current={f === filter ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-bold ${f === filter ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-navy/10"}`}
          >
            {t(`filter.${f}`)} <span className={`font-numbers text-xs ${f === filter ? "text-white/70" : "text-muted"}`}>{formatNumber(counts[i], lang)}</span>
          </Link>
        ))}
      </nav>

      {users.length === 0 ? (
        <Card><p className="text-sm text-muted">{t("noResults")}</p></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">{t("tableCaption", { n: counts[FILTERS.indexOf(filter)] })}</caption>
            <thead className="text-xs text-muted">
              <tr className="border-b border-navy/8">
                {["creator", "planLabel", "followers", "joined", "lastActive", "status"].map((h) => <th key={h} scope="col" className="px-4 py-3 text-start font-medium">{t(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const p = u.page;
                const name = p?.translations.find((tr) => tr.lang === p.primaryLang)?.fullName || p?.translations[0]?.fullName || "";
                const plan = planLabel(u.subscription);
                const daysLeft = u.subscription?.trialEndsAt ? Math.max(0, Math.ceil((u.subscription.trialEndsAt.getTime() - now.getTime()) / DAY)) : 0;
                const detail = plan === "pro" ? (u.subscription?.cycle ? t(`cycle.${u.subscription.cycle}`) : "") : plan === "trial" ? t("daysLeft", { n: daysLeft }) : "";
                const followers = p?.socialAccounts.reduce((s, a) => s + a.followers, 0) ?? 0;
                const status = u.suspendedAt ? "suspended" : !p ? "noPage" : p.deletedAt ? "deleted" : p.isPublished ? "published" : "hidden";
                const statusTone = status === "published" ? "text-good" : status === "suspended" || status === "deleted" ? "text-bad" : "text-muted";
                const days = p ? Math.round((p.updatedAt.getTime() - now.getTime()) / DAY) : 0;
                return (
                  <tr key={u.id} className="border-b border-navy/6 last:border-0 hover:bg-navy/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="flex min-h-11 items-center gap-3">
                        {p?.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- storage URL, small avatar
                          <img src={p.photoUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-navy/5 font-bold uppercase">{(name || u.email)[0]}</span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-bold">{name || (p ? <bdi dir="ltr">@{p.username}</bdi> : t("noPage"))}</span>
                          <span className="truncate text-xs text-muted" dir="ltr">{p ? `wsool.link/${p.username}` : u.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-col items-start gap-1">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pillTone[plan]}`}>{t(`plan.${plan}`)}</span>
                        {detail && <span className="text-xs text-muted">{detail}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-numbers font-bold">{followers ? formatCompact(followers, lang) : "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{date.format(u.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{p ? (days > -1 ? t("today") : ago.format(days, "day")) : "—"}</td>
                    <td className={`px-4 py-3 text-xs font-bold whitespace-nowrap ${statusTone}`}>
                      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> {t(`state.${status}`)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {users.length === 100 && <p className="text-xs text-muted">{t("first100")}</p>}
    </>
  );
}

async function SearchBox({ searchParams, label }: { searchParams: SP; label: string }) {
  const sp = await searchParams;
  return (
    <form role="search" className="relative w-full sm:max-w-md">
      {typeof sp.f === "string" && <input type="hidden" name="f" value={sp.f} />}
      <Search aria-hidden="true" size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
      <input name="q" type="search" aria-label={label} defaultValue={String(sp.q ?? "")} placeholder={label} className="h-[46px] w-full rounded-full border border-navy/10 bg-white ps-11 pe-4 text-sm" />
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
      <AdminHeader title={nav("users")} subtitle={(await getTranslations("Admin.sub"))("users")} search={false} />
      <Suspense fallback={null}><SearchBox searchParams={searchParams} label={t("search")} /></Suspense>
      <Suspense fallback={null}><Results lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
