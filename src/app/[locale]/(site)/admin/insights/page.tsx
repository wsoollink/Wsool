import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, Settings2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ActiveFilters, CreatorFilterForm, dimensionOptions, withParams, type Dimension, type Option } from "@/components/admin/CreatorFilters";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { listCategories } from "@/lib/categories";
import { countBy, creatorRows, matchesFilters, readFilters, type CreatorFilters } from "@/lib/creator-insights";
import { formatNumber } from "@/lib/format";

type SP = Promise<Record<string, string | string[] | undefined>>;
const CITY_LIMIT = 15;
const PLAN_LINK = { pro: "paid", trial: "trial", free: "free" } as const;

/** One breakdown: label, count, share bar; each row opens the matching creators in Users. */
function Breakdown({ title, options, total, lang, link, limit }: { title: string; options: Option[]; total: number; lang: Locale; link: (key: string) => string; limit?: number }) {
  const shown = limit ? options.slice(0, limit) : options;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-bold">{title}</h2>
      <ul className="flex flex-col gap-1">
        {shown.map((o) => {
          const pct = total ? Math.round((o.count / total) * 100) : 0;
          return (
            <li key={o.key}>
              <Link href={link(o.key)} className="flex min-h-11 flex-col justify-center gap-1 rounded-xl px-2 py-1.5 hover:bg-navy/[0.03]">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={`truncate ${o.key === "none" ? "text-muted" : "font-medium"}`}>{o.label}</span>
                  <span className="shrink-0 font-numbers text-xs text-muted"><b className="text-navy">{formatNumber(o.count, lang)}</b> · {pct}%</span>
                </span>
                <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-navy/6">
                  <span className={`block h-full rounded-full ${o.key === "none" ? "bg-navy/20" : "bg-blue"}`} style={{ width: `${Math.max(pct, o.count ? 2 : 0)}%` }} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

async function Insights({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  const admin = await requireAdmin("users.view");
  const t = await getTranslations("Admin.insights");
  const filters = readFilters(await searchParams);
  const [all, categories] = await Promise.all([creatorRows(), listCategories()]);
  // Creators = accounts with a page that isn't deleted (sign-ups without a page are left out).
  const creators = all.filter((r) => r.status !== "noPage" && r.status !== "deleted");
  const rows = creators.filter((r) => matchesFilters(r, filters));
  const options = await dimensionOptions(rows, categories, lang);
  const total = rows.length;
  const pctOf = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const usersLink = (extra: CreatorFilters & { f?: string }) => withParams("/admin/users", { ...filters, ...extra });
  const link = (dim: Dimension) => (key: string) => usersLink({ [dim]: key });
  const plans = countBy(rows, (r) => [r.plan]);
  const planT = await getTranslations("Admin.users.plan");

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <CreatorFilterForm action="/admin/insights" options={options} filters={filters} keep={{}} />
        <ActiveFilters path="/admin/insights" filters={filters} options={options} keep={{}} />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t("tiles.creators"), value: formatNumber(total, lang) },
          { label: t("tiles.withCategory"), value: `${pctOf(rows.filter((r) => r.categories.length).length)}%` },
          { label: t("tiles.withCountry"), value: `${pctOf(rows.filter((r) => r.countryCode).length)}%` },
          { label: t("tiles.withCity"), value: `${pctOf(rows.filter((r) => r.city_).length)}%` },
        ].map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1">
            <span className="text-xs text-muted">{tile.label}</span>
            <span className="font-numbers text-2xl font-bold">{tile.value}</span>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={withParams("/api/admin/users", { ...filters })} download className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy px-4 text-[13.5px] font-bold text-white">
          <Download aria-hidden="true" size={16} /> {t("export", { n: total })}
        </a>
        {can(admin, "owner") && (
          <Link href="/admin/categories" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-bold ring-1 ring-navy/10">
            <Settings2 aria-hidden="true" size={16} /> {t("manageCategories")}
          </Link>
        )}
      </div>

      {total === 0 ? (
        <Card><p className="text-sm text-muted">{t("empty")}</p></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Breakdown title={t("dim.cat")} options={options.cat} total={total} lang={lang} link={link("cat")} />
          <Breakdown title={t("dim.country")} options={options.country} total={total} lang={lang} link={link("country")} />
          <Breakdown title={t("dim.city")} options={options.city} total={total} lang={lang} link={link("city")} limit={CITY_LIMIT} />
          <Breakdown title={t("dim.platform")} options={options.platform} total={total} lang={lang} link={link("platform")} />
          <Breakdown title={t("dim.size")} options={options.size} total={total} lang={lang} link={link("size")} />
          <Breakdown
            title={t("plan")} total={total} lang={lang}
            options={plans.map((p) => ({ key: p.key, label: planT(p.key as "pro"), count: p.count }))}
            link={(key) => usersLink({ f: PLAN_LINK[key as keyof typeof PLAN_LINK] })}
          />
        </div>
      )}
      <p className="text-xs text-muted">{t("note")}</p>
    </div>
  );
}

export default async function InsightsPage({ params, searchParams }: PageProps<"/[locale]/admin/insights">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("insights")} subtitle={(await getTranslations("Admin.sub"))("insights")} search={false} />
      <Suspense fallback={null}><Insights lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
