import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, MapPin, Search, Users } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Panel } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { PLATFORMS, PLATFORM_NAMES } from "@/config/platforms";
import type { Locale } from "@/i18n/config";
import { listCategories } from "@/lib/categories";
import { DIRECTORY_DAILY_LIMIT, DIRECTORY_PAGE_SIZE, DIRECTORY_SIZES, directoryRows, readDirectoryQuery, recordImpressions, searchDirectory } from "@/lib/directory";
import { formatCompact, formatNumber } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { InviteFromDirectory } from "./Controls";

const select = "h-11 w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] shadow-card outline-none focus:border-blue focus:ring-3 focus:ring-blue/15";

/**
 * Creator directory (owner, Nov 2026): search the creators who chose to be listed, by category, place, platform,
 * audience size, language and verification. Plain GET form, so results are shareable within the team and work without JS.
 */
export async function Directory({ lang, sp, userId, canInvite }: { lang: Locale; sp: Record<string, string | string[] | undefined>; userId: string; canInvite: boolean }) {
  const t = await getTranslations("Directory");
  const q = readDirectoryQuery(sp);
  if (!(await rateLimit(`directory:${userId}`, DIRECTORY_DAILY_LIMIT, 86_400))) {
    return <Panel title={t("title")}><p className="text-sm text-muted">{t("limit")}</p></Panel>;
  }
  const [rows, categories] = await Promise.all([directoryRows(lang), listCategories()]);
  const { total, results } = searchDirectory(rows, q);
  await recordImpressions(results.map((r) => r.pageId)).catch(() => {});

  // Filter choices come from the listed creators only (no empty options).
  const countries = new Map<string, string>();
  const cities = new Map<string, string>();
  for (const r of rows) {
    if (r.countryCode && !countries.has(r.countryCode)) countries.set(r.countryCode, r.country);
    if (r.cityKey && (!q.country || r.countryCode === q.country) && !cities.has(r.cityKey)) cities.set(r.cityKey, r.city);
  }
  const regionName = new Intl.DisplayNames([lang === "ar" ? "ar" : "en"], { type: "region" });
  const country = (code: string) => { try { return regionName.of(code) ?? code; } catch { return code; } };
  const catName = new Map(categories.map((c) => [c.id, lang === "en" ? c.nameEn || c.nameAr : c.nameAr]));
  const pages = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "p") u.set(k, v);
    u.set("tab", "directory");
    if (p > 1) u.set("p", String(p));
    return `/agency?${u}`;
  };
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action="/agency" className="flex flex-col gap-3 rounded-card border border-line bg-card p-4 shadow-card md:p-5">
        <input type="hidden" name="tab" value="directory" />
        <div className="relative">
          <label htmlFor="dir-q" className="sr-only">{t("search")}</label>
          <Search aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ltr:left-3 rtl:right-3" />
          <input id="dir-q" name="q" defaultValue={q.q ?? ""} placeholder={t("searchPh")} maxLength={80} className={`${select} ltr:pl-10 rtl:pr-10`} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { k: "cat", label: t("category"), options: categories.map((c) => [c.id, catName.get(c.id) ?? ""] as const) },
            { k: "country", label: t("country"), options: [...countries.keys()].map((c) => [c, country(c)] as const).sort((a, b) => a[1].localeCompare(b[1])) },
            { k: "city", label: t("city"), options: [...cities.entries()].sort((a, b) => a[1].localeCompare(b[1])) },
            { k: "platform", label: t("platform"), options: PLATFORMS.map((p) => [p, PLATFORM_NAMES[p]] as const) },
            { k: "size", label: t("size"), options: DIRECTORY_SIZES.map((s) => [s, t(`sizes.${s}`)] as const) },
            { k: "lang", label: t("lang"), options: [["ar", t("langs.ar")], ["en", t("langs.en")]] as const },
          ].map((f) => (
            <div key={f.k} className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`dir-${f.k}`} className="text-[12.5px] font-medium text-muted">{f.label}</label>
              <select id={`dir-${f.k}`} name={f.k} defaultValue={one(f.k)} className={select}>
                <option value="">{t("any")}</option>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="verified" value="1" defaultChecked={q.verified} className="size-5 accent-[var(--color-blue)]" />
            {t("verifiedOnly")}
          </label>
          <div className="flex gap-2">
            <Link href="/agency?tab=directory" className={buttonClasses("secondary")}>{t("clear")}</Link>
            <button type="submit" className={buttonClasses("primary")}><Search aria-hidden="true" size={16} />{t("go")}</button>
          </div>
        </div>
      </form>

      <p className="text-sm text-muted" role="status">{t("count", { n: total })}</p>

      {results.length === 0 ? (
        <div className="rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">{t("empty")}</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <li key={r.pageId} className="flex flex-col gap-3 rounded-card border border-line bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <Image src={r.photoUrl} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-bold"><bdi className="truncate">{r.name}</bdi>{r.verified && <BadgeCheck aria-label={t("verified")} size={16} className="shrink-0 text-blue" />}</p>
                  {r.specialty && <p className="truncate text-[13px] text-blue"><bdi>{r.specialty}</bdi></p>}
                  {(r.city || r.country) && (
                    <p className="flex items-center gap-1 truncate text-xs text-muted"><MapPin aria-hidden="true" size={12} /><bdi>{[r.countryCode ? country(r.countryCode) : r.country, r.city].filter(Boolean).join(lang === "ar" ? "، " : ", ")}</bdi></p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <ul className="flex flex-wrap gap-1.5" aria-label={t("platforms")}>
                  {r.platforms.slice(0, 7).map((p) => <li key={p} title={PLATFORM_NAMES[p]} className="text-navy"><PlatformIcon platform={p} size={16} /><span className="sr-only">{PLATFORM_NAMES[p]}</span></li>)}
                </ul>
                <p className="flex items-center gap-1 text-sm">
                  <Users aria-hidden="true" size={14} className="text-muted" />
                  {r.followers === null ? <span className="text-xs text-muted">{r.locked ? t("privatePage") : t("privateNumbers")}</span> : <b className="font-numbers">{formatCompact(r.followers, lang)}</b>}
                </p>
              </div>
              {r.categories.length > 0 && (
                <p className="flex flex-wrap gap-1.5">{r.categories.map((c) => catName.get(c)).filter(Boolean).map((c) => <span key={c} className="rounded-full bg-bg px-2.5 py-0.5 text-[12px] text-muted">{c}</span>)}</p>
              )}
              <div className="mt-auto flex gap-2">
                {/* A full page load: /agency/open counts the visit for the creator's stats. */}
                <a href={`/agency/open?u=${r.username}`} target="_blank" rel="noopener" className={buttonClasses("secondary", "flex-1")}>{t("open")}</a>
                {canInvite && <InviteFromDirectory username={r.username} />}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label={t("pages")} className="flex items-center justify-center gap-2">
          {q.page > 1 && <Link href={pageHref(q.page - 1)} className={buttonClasses("secondary")}>{t("prev")}</Link>}
          <span className="text-sm text-muted">{t("pageOf", { p: formatNumber(q.page, lang), n: formatNumber(pages, lang) })}</span>
          {q.page < pages && <Link href={pageHref(q.page + 1)} className={buttonClasses("secondary")}>{t("next")}</Link>}
        </nav>
      )}
      <p className="text-xs text-muted">{t("note")}</p>
    </div>
  );
}
