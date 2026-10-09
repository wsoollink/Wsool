import "server-only";
import { db } from "@/lib/db";
import { today } from "@/lib/analytics";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

type Count = { key: string; count: number };

/** Everything the Analytics section shows for one page over the last `days` days. */
export async function analyticsReport(pageId: string, days: Range) {
  const end = today();
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const where = { pageId, day: { gte: start, lte: end } };

  const [daily, unique, clicks, countries, referrers, devices, clickTargets] = await Promise.all([
    db.pageView.groupBy({ by: ["day"], where, _count: true }),
    db.pageView.findMany({ where, distinct: ["visitorHash", "day"], select: { visitorHash: true } }),
    db.contactClick.groupBy({ by: ["kind"], where, _count: true }),
    db.pageView.groupBy({ by: ["country"], where: { ...where, country: { not: null } }, _count: true, orderBy: { _count: { country: "desc" } }, take: 6 }),
    db.pageView.groupBy({ by: ["referrer"], where: { ...where, referrer: { not: null } }, _count: true, orderBy: { _count: { referrer: "desc" } }, take: 6 }),
    db.pageView.groupBy({ by: ["device"], where, _count: true }),
    db.contactClick.groupBy({ by: ["kind", "platform", "targetId"], where, _count: true, orderBy: { _count: { kind: "desc" } }, take: 6 }),
  ]);

  // Every day in the range, zero when there were no visits.
  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d._count]));
  const series = Array.from({ length: days }, (_, i) => {
    const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { day, views: byDay.get(day) ?? 0 };
  });
  const click = (k: string) => clicks.find((c) => c.kind === k)?._count ?? 0;
  const list = (rows: { _count: number }[], key: (r: never) => string | null): Count[] =>
    rows.map((r) => ({ key: key(r as never) ?? "", count: r._count })).filter((r) => r.key);

  return {
    views: series.reduce((s, d) => s + d.views, 0),
    visitors: unique.length,
    whatsapp: click("whatsapp"),
    email: click("email"),
    social: click("social"),
    work: click("work"),
    series,
    countries: list(countries, (r: { country: string | null }) => r.country),
    referrers: list(referrers, (r: { referrer: string | null }) => r.referrer),
    devices: list(devices, (r: { device: string }) => r.device).sort((a, b) => b.count - a.count),
    /** What visitors tapped most: WhatsApp, email, a social icon or a work video (with its platform). */
    topClicks: await withTargetNames(clickTargets.map((c) => ({ kind: c.kind, platform: c.platform, targetId: c.targetId, count: c._count }))),
  };
}

/** Adds the current title of tapped links / services (null once deleted). */
async function withTargetNames<T extends { kind: string; targetId: string | null }>(rows: T[]) {
  const ids = (kind: string) => rows.filter((r) => r.kind === kind && r.targetId).map((r) => r.targetId!);
  const [links, services] = await Promise.all([
    db.pageLink.findMany({ where: { id: { in: ids("link") } }, select: { id: true, title: true } }),
    db.service.findMany({ where: { id: { in: ids("service") } }, select: { id: true, name: true } }),
  ]);
  const names = new Map([...links.map((l) => [l.id, l.title] as const), ...services.map((s) => [s.id, s.name] as const)]);
  return rows.map((r) => ({ ...r, targetName: r.targetId ? names.get(r.targetId) ?? null : null }));
}

export type AnalyticsReport = Awaited<ReturnType<typeof analyticsReport>>;

/** Views and contact taps for one page between two days (inclusive), for "vs previous period". */
export async function periodTotals(pageId: string, from: Date, to: Date) {
  const where = { pageId, day: { gte: from, lte: to } };
  const [views, clicks, countries] = await Promise.all([
    db.pageView.count({ where }),
    db.contactClick.groupBy({ by: ["kind"], where, _count: true }),
    db.pageView.groupBy({ by: ["country"], where: { ...where, country: { not: null } }, _count: true }),
  ]);
  const click = (k: string) => clicks.find((c) => c.kind === k)?._count ?? 0;
  return { views, whatsapp: click("whatsapp"), email: click("email"), countries: countries.length };
}
