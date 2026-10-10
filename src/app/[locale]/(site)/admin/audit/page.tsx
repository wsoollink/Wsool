import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { auditSentences } from "@/lib/audit-text";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { AdminHeader } from "@/components/admin/AdminHeader";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Action kinds staff filter by (action keys start with these). */
const GROUPS = {
  verification: ["verification.", "license."],
  users: ["user.", "page.", "creators."],
  money: ["invoice.", "expense.", "investor_link.", "discount."],
  newsletter: ["newsletter."],
  categories: ["category."],
  team: ["team."],
} as const;
type Group = keyof typeof GROUPS;
const PERIODS = ["today", "7", "30"] as const;
const DAY = 86_400_000;
/** Days start at midnight Saudi time (UTC+3). */
const RIYADH = 3 * 3_600_000;
const dayStart = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - RIYADH);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function readFilters(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const who = one("who")?.slice(0, 254);
  const type = one("type") as Group | undefined;
  const p = one("p") as (typeof PERIODS)[number] | undefined;
  return {
    who: who || undefined,
    type: type && type in GROUPS ? type : undefined,
    p: p && PERIODS.includes(p) ? p : undefined,
    from: isDate(sp.from) ? sp.from : undefined,
    to: isDate(sp.to) ? sp.to : undefined,
  };
}

function whereFor(f: ReturnType<typeof readFilters>, now: Date): Prisma.AuditLogWhereInput {
  const today = new Date(now.getTime() + RIYADH).toISOString().slice(0, 10);
  const from = f.p === "today" ? dayStart(today) : f.p ? new Date(dayStart(today).getTime() - (Number(f.p) - 1) * DAY) : f.from ? dayStart(f.from) : undefined;
  const to = !f.p && f.to ? new Date(dayStart(f.to).getTime() + DAY) : undefined;
  return {
    ...(f.who && { actorEmail: f.who }),
    ...(f.type && { OR: GROUPS[f.type].map((prefix) => ({ action: { startsWith: prefix } })) }),
    ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lt: to }) } }),
  };
}

const href = (f: Record<string, string | undefined>) => {
  const qs = new URLSearchParams(Object.entries(f).filter((e): e is [string, string] => !!e[1]));
  return qs.size ? `/admin/audit?${qs}` : "/admin/audit";
};
const field = "h-11 min-w-0 rounded-xl border border-navy/16 bg-white px-3 text-sm";

/** Owner only: admin actions as readable sentences, grouped by day, filtered by who / kind / period. Append-only. */
async function Log({ lang, searchParams }: { lang: Locale; searchParams: SP }) {
  await requireAdmin("owner");
  const t = await getTranslations("Admin.audit");
  const f = readFilters(await searchParams);
  const filtered = !!(f.who || f.type || f.p || f.from || f.to);
  const [entries, actors] = await Promise.all([
    db.auditLog.findMany({ where: whereFor(f, new Date()), orderBy: { createdAt: "desc" }, take: 200 }),
    db.auditLog.findMany({ distinct: ["actorEmail"], select: { actorEmail: true }, orderBy: { actorEmail: "asc" } }),
  ]);

  const filters = (
    <Card className="flex flex-col gap-3">
      <nav aria-label={t("period")} className="flex flex-wrap gap-2">
        {[undefined, ...PERIODS].map((p) => {
          const on = f.p === p && (p || (!f.from && !f.to));
          return (
            <Link key={p ?? "all"} href={href({ who: f.who, type: f.type, p })} aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-[13.5px] font-bold ${on ? "bg-navy text-white" : "bg-white ring-1 ring-navy/10"}`}>
              {t(`periods.${p ?? "all"}`)}
            </Link>
          );
        })}
      </nav>
      <form action="/admin/audit" className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-medium text-muted sm:flex-none">
          {t("who")}
          <select name="who" defaultValue={f.who ?? ""} className={field}>
            <option value="">{t("everyone")}</option>
            {actors.map((a) => <option key={a.actorEmail} value={a.actorEmail}>{a.actorEmail}</option>)}
          </select>
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-medium text-muted sm:flex-none">
          {t("type")}
          <select name="type" defaultValue={f.type ?? ""} className={field}>
            <option value="">{t("allTypes")}</option>
            {(Object.keys(GROUPS) as Group[]).map((g) => <option key={g} value={g}>{t(`types.${g}`)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          {t("from")}
          <input type="date" name="from" defaultValue={f.from ?? ""} dir="ltr" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          {t("to")}
          <input type="date" name="to" defaultValue={f.to ?? ""} dir="ltr" className={field} />
        </label>
        <button type="submit" className="inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm font-bold text-white">{t("apply")}</button>
        {filtered && <Link href="/admin/audit" className="inline-flex h-11 items-center px-2 text-sm font-bold text-muted underline">{t("clear")}</Link>}
      </form>
    </Card>
  );

  if (entries.length === 0) return <>{filters}<Card><p className="text-sm text-muted">{filtered ? t("noMatch") : t("empty")}</p></Card></>;
  const sentences = await auditSentences(entries);
  const dayFmt = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "full" });
  const time = new Intl.DateTimeFormat(toIntlLocale(lang), { timeStyle: "short" });
  const days: { label: string; items: { e: (typeof entries)[number]; text: string }[] }[] = [];
  entries.forEach((e, i) => {
    const label = dayFmt.format(e.createdAt);
    if (days.at(-1)?.label !== label) days.push({ label, items: [] });
    days.at(-1)!.items.push({ e, text: sentences[i] });
  });

  return (
    <div className="flex flex-col gap-4">
      {filters}
      {days.map((d) => (
        <section key={d.label} className="flex flex-col gap-2">
          <h2 className="text-[13px] font-bold text-muted">{d.label}</h2>
          <Card className="p-2">
            <ul className="flex flex-col divide-y divide-navy/6">
              {d.items.map(({ e, text }) => (
                <li key={e.id} className="flex items-start gap-3 px-2 py-3">
                  <span aria-hidden="true" className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-navy/5 text-xs font-bold uppercase">{e.actorEmail[0]}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{text}</span>
                    <span className="text-xs text-muted"><bdi dir="ltr">{e.actorEmail}</bdi></span>
                  </span>
                  <time dateTime={e.createdAt.toISOString()} className="shrink-0 text-xs text-muted">{time.format(e.createdAt)}</time>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
      {entries.length === 200 && <p className="text-xs text-muted">{t("latest200")}</p>}
    </div>
  );
}

export default async function AuditPage({ params, searchParams }: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("audit")} subtitle={(await getTranslations("Admin.sub"))("audit")} search={false} />
      <Suspense fallback={null}><Log lang={locale} searchParams={searchParams} /></Suspense>
    </div>
  );
}
