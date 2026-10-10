import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { codeStatus, DISCOUNT_BATCH_MAX, DISCOUNT_DAYS, DISCOUNT_MAX, DISCOUNT_MIN, type CodeStatus } from "@/lib/discounts";
import { formatNumber } from "@/lib/format";
import { CreateCodes, DeleteRevokedButton, RevokeButton } from "./CodesManager";

type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = ["all", "unused", "used", "expired", "revoked"] as const;
type Filter = (typeof FILTERS)[number];
const tone: Record<CodeStatus, string> = { unused: "bg-blue/10 text-blue", used: "bg-good/10 text-good", expired: "bg-navy/5 text-muted", revoked: "bg-bad/8 text-bad" };

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
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-bold ${f === filter ? "bg-navy text-white" : "bg-white ring-1 ring-navy/10"}`}
          >
            {t(`filter.${f}`)} <span className={`font-numbers text-xs ${f === filter ? "text-white/70" : "text-muted"}`}>{formatNumber(count(f), lang)}</span>
          </Link>
        ))}
        {count("revoked") > 0 && (filter === "all" || filter === "revoked") && (
          <span className="ms-auto"><DeleteRevokedButton id={null} count={count("revoked")} /></span>
        )}
      </nav>

      {shown.length === 0 ? (
        <Card><p className="text-sm text-muted">{t("empty")}</p></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-navy/8">
                {["code", "percent", "for", "created", "expires", "status", ""].map((h) => <th key={h} scope="col" className="px-4 py-3 text-start font-medium">{h && t(`table.${h}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-navy/6 last:border-0">
                  <td className="px-4 py-3"><code dir="ltr" className="font-bold">{r.code}</code></td>
                  <td className="px-4 py-3 font-bold">{r.percent}%</td>
                  <td className="px-4 py-3">
                    <span className="block">{r.note || "—"}</span>
                    {r.email && <span dir="ltr" className="block text-xs text-muted rtl:text-end">{r.email}</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{date.format(r.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{date.format(r.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${tone[r.status]}`}>{t(`status.${r.status}`)}</span>
                    {r.status === "used" && r.usedAt && (
                      <span className="mt-1 block text-xs text-muted">
                        <bdi dir="ltr">{usedBy.get(r.usedBy ?? "") ?? "—"}</bdi> · {date.format(r.usedAt)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "unused" && <RevokeButton id={r.id} code={r.code} />}
                    {r.status === "revoked" && <DeleteRevokedButton id={r.id} code={r.code} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
      <AdminHeader title={nav("discounts")} subtitle={(await getTranslations("Admin.sub"))("discounts")} search={false} />
      <Suspense fallback={null}><Codes lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
