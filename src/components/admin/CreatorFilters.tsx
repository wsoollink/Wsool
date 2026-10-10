import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { X } from "lucide-react";
import { categoryName } from "@/config/categories";
import { PLATFORM_NAMES } from "@/config/platforms";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { countBy, FILTER_KEYS, SIZE_BANDS, type CreatorFilters, type CreatorRow } from "@/lib/creator-insights";

type Category = { id: string; nameAr: string; nameEn: string };
export type Dimension = (typeof FILTER_KEYS)[number];
export type Option = { key: string; label: string; count: number };

/**
 * Value lists with counts for each insight dimension (category, country, city,
 * platform, size), labelled in the staff member's language. "none" = the
 * creator didn't fill it.
 */
export async function dimensionOptions(rows: CreatorRow[], categories: Category[], lang: Locale): Promise<Record<Dimension, Option[]>> {
  const t = await getTranslations("Admin.insights");
  const regions = new Intl.DisplayNames([toIntlLocale(lang)], { type: "region" });
  const catById = new Map(categories.map((c) => [c.id, c]));
  const none = t("none");
  const label = (key: string, name: () => string) => (key === "none" ? none : name());

  const cats = countBy(rows, (r) => r.categories.filter((id) => catById.has(id)));
  const sizes = countBy(rows, (r) => [r.size === "none" ? null : r.size]);
  return {
    // Every category is listed (zero included) so the owner sees unused ones.
    cat: [
      ...categories.map((c) => ({ key: c.id, label: categoryName(c, lang), count: cats.find((x) => x.key === c.id)?.count ?? 0 })).sort((a, b) => b.count - a.count),
      ...cats.filter((x) => x.key === "none").map((x) => ({ key: x.key, label: none, count: x.count })),
    ],
    country: countBy(rows, (r) => [r.countryCode]).map((x) => ({ key: x.key, count: x.count, label: label(x.key, () => regions.of(x.key) ?? x.key) })),
    city: countBy(rows, (r) => [r.city_?.key ?? null], (_k, r) => r.city_?.[lang] ?? r.city).map((x) => ({ key: x.key, count: x.count, label: label(x.key, () => x.sample ?? x.key) })),
    platform: countBy(rows, (r) => r.platforms).map((x) => ({ key: x.key, count: x.count, label: label(x.key, () => PLATFORM_NAMES[x.key as keyof typeof PLATFORM_NAMES] ?? x.key) })),
    size: SIZE_BANDS.map((s) => ({ key: s === "none" ? "none" : s, label: t(`size.${s}`), count: sizes.find((x) => x.key === s || (s === "none" && x.key === "none"))?.count ?? 0 }))
      .filter((o) => o.key !== "none" || o.count > 0),
  };
}

/** URL for a page with these params (empty values dropped). */
export function withParams(path: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  return qs.size ? `${path}?${qs}` : path;
}

const select = "h-11 min-w-0 rounded-xl border border-navy/16 bg-white px-3 text-sm";

/** GET form with one select per dimension (keeps the search text and plan filter). */
export async function CreatorFilterForm({ action, options, filters, keep }: { action: string; options: Record<Dimension, Option[]>; filters: CreatorFilters; keep: Record<string, string | undefined> }) {
  const t = await getTranslations("Admin.insights");
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      {FILTER_KEYS.map((dim) => (
        <label key={dim} className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-muted sm:flex-none">
          {t(`dim.${dim}`)}
          <select name={dim} defaultValue={filters[dim] ?? ""} className={select}>
            <option value="">{t("all")}</option>
            {options[dim].map((o) => <option key={o.key} value={o.key}>{o.label} ({o.count})</option>)}
          </select>
        </label>
      ))}
      <button type="submit" className="inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm font-bold text-white">{t("apply")}</button>
    </form>
  );
}

/** Chips for the active filters, each with a link that removes it. */
export async function ActiveFilters({ path, filters, options, keep }: { path: string; filters: CreatorFilters; options: Record<Dimension, Option[]>; keep: Record<string, string | undefined> }) {
  const t = await getTranslations("Admin.insights");
  const active = FILTER_KEYS.filter((k) => filters[k]);
  if (!active.length) return null;
  const all = { ...keep, ...filters };
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label={t("activeFilters")}>
      {active.map((k) => {
        const label = options[k].find((o) => o.key === filters[k])?.label ?? filters[k];
        return (
          <li key={k}>
            <Link href={withParams(path, { ...all, [k]: undefined })} aria-label={t("removeFilter", { name: `${t(`dim.${k}`)}: ${label}` })} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-blue/10 ps-3 pe-2 text-[13px] font-bold text-blue">
              {t(`dim.${k}`)}: {label} <X aria-hidden="true" size={14} />
            </Link>
          </li>
        );
      })}
      <li><Link href={withParams(path, keep)} className="text-[13px] font-bold text-muted underline">{t("clearFilters")}</Link></li>
    </ul>
  );
}
