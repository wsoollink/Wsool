import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { codeStatus, DISCOUNT_BATCH_MAX, DISCOUNT_DAYS, DISCOUNT_MAX, DISCOUNT_MIN } from "@/lib/discounts";
import { formatNumber } from "@/lib/format";
import { CreateCodes, DeleteRevokedButton } from "./CodesManager";
import { CodesTable } from "./CodesTable";

type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = ["all", "unused", "used", "expired", "revoked"] as const;
type Filter = (typeof FILTERS)[number];

/** Discount codes: make them for named people, see each one's status, cancel unused ones. */
async function Codes({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  await requireAdmin("discounts.manage");
  const t = await getTranslations("Admin.discounts");
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.s as Filter) ? (sp.s as Filter) : "all";
  const rows = await db.discountCode.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const now = new Date();
  const withStatus = rows.map((r) => ({ ...r, status: codeStatus(r, now) }));
  const users = await db.user.findMany({
    where: { id: { in: withStatus.map((r) => r.usedBy).filter((x): x is string => !!x) } },
    select: { id: true, email: true, page: { select: { username: true } } },
  });
  const usedBy = new Map(users.map((u) => [u.id, u.page?.username ?? u.email]));
  const count = (f: Filter) => (f === "all" ? withStatus.length : withStatus.filter((r) => r.status === f).length);
  const shown = filter === "all" ? withStatus : withStatus.filter((r) => r.status === filter);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-4">
      <CreateCodes limits={{ min: DISCOUNT_MIN, max: DISCOUNT_MAX, batch: DISCOUNT_BATCH_MAX, days: DISCOUNT_DAYS }} />

      <nav aria-label={t("filters")} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f} href={f === "all" ? "/admin/discounts" : `/admin/discounts?s=${f}`} aria-current={f === filter ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-bold ${f === filter ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted shadow-card ring-1 ring-line hover:text-navy"}`}
          >
            {t(`filter.${f}`)} <span className={`font-numbers text-xs ${f === filter ? "text-blue/70" : "text-faint"}`}>{formatNumber(count(f), lang)}</span>
          </Link>
        ))}
        {count("revoked") > 0 && (filter === "all" || filter === "revoked") && (
          <span className="ms-auto"><DeleteRevokedButton id={null} count={count("revoked")} /></span>
        )}
      </nav>

      {shown.length === 0 ? (
        <Card><p className="text-sm text-muted">{t("empty")}</p></Card>
      ) : (
        <CodesTable rows={shown.map((r) => ({
          id: r.id, code: r.code, note: r.note, email: r.email,
          discount: (r.audience === "agencies" ? `${t("agencyTag")} · ` : "") + (r.freeCycle
            ? r.freePlan && r.freePlan !== "trial" && r.freePlan !== "custom"
              ? t("freeAgencyLabel", { plan: t(`agencyPlans.${r.freePlan}`), cycle: t(`cycle.${r.freeCycle}`) })
              : t("freeLabel", { cycle: t(`cycle.${r.freeCycle}`) })
            : `${r.percent}%`),
          created: date.format(r.createdAt), expires: date.format(r.expiresAt), status: r.status,
          usedLine: r.status === "used" && r.usedAt ? `${usedBy.get(r.usedBy ?? "") ?? "—"} · ${date.format(r.usedAt)}` : null,
        }))} />
      )}
    </div>
  );
}

export default async function DiscountsPage({ params, searchParams }: PageProps<"/[locale]/admin/discounts">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("discounts")} subtitle={(await getTranslations("Admin.sub"))("discounts")} />
      <Suspense fallback={null}><Codes lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
