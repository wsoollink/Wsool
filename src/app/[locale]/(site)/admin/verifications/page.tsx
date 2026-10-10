import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES, profileUrl } from "@/config/platforms";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { CheckCheck } from "lucide-react";
import { REVIEW_HOURS } from "@/config/verification";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatCompact, formatNumber } from "@/lib/format";
import { signedVerificationUrl } from "@/lib/storage";
import { compareRead, type AccountRead } from "@/lib/ai/compare";
import { aiEnabled } from "@/lib/ai/screenshots";
import { LicenseReviewCard } from "./LicenseReviewCard";
import { ReviewCard } from "./ReviewCard";
import { AdminHeader } from "@/components/admin/AdminHeader";

const PAGE_SIZE = 20;

/** "5 minutes ago" / "3 hours ago" / "2 days ago", in the panel language. */
function age(from: Date, now: number, lang: Locale) {
  const minutes = Math.max(1, Math.floor((now - from.getTime()) / 60_000));
  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(lang));
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? rtf.format(-hours, "hour") : rtf.format(-Math.floor(hours / 24), "day");
}

type AiFilter = "" | "match" | "check";

async function Queue({ lang, tab, id, ai }: { lang: Locale; tab: Tab; id: string; ai: AiFilter }) {
  const admin = await requireAdmin("verifications.view");
  const t = await getTranslations("Admin.verifications");
  const now = new Date().getTime();

  if (tab === "licenses") {
    const licenses = await db.license.findMany({
      where: { verificationStatus: "in_review", fileUrl: { not: null } },
      orderBy: { submittedAt: "asc" },
      take: PAGE_SIZE,
      include: { page: { select: { username: true } } },
    });
    if (licenses.length === 0) return <Card><p className="text-sm text-muted">{t("empty")}</p></Card>;
    return (
      <div className="flex flex-col gap-3">
        {licenses.map((l) => (
          <LicenseReviewCard
            key={l.id} canDecide={can(admin, "verifications.decide")}
            item={{ id: l.id, name: l.name, number: l.number, username: l.page.username, fileUrl: l.fileUrl!, waiting: l.submittedAt ? age(l.submittedAt, now, lang) : "" }}
          />
        ))}
      </div>
    );
  }

  if (tab === "decided") {
    const decided = await db.verificationRequest.findMany({
      where: { status: { in: ["approved", "rejected"] } },
      orderBy: { reviewedAt: "desc" },
      take: 50,
      include: { account: { select: { page: { select: { username: true } } } } },
    });
    const reviewers = await db.user.findMany({ where: { id: { in: decided.map((d) => d.reviewedBy).filter((x): x is string => !!x) } }, select: { id: true, email: true } });
    return (
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-start text-xs text-muted">
            <tr className="border-b border-line">
              {["account", "result", "reviewer", "when"].map((h) => <th key={h} scope="col" className="p-3 text-start font-medium">{t(`table.${h}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {decided.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-0">
                <td className="p-3" dir="ltr">@{d.handle} <span className="text-muted">/{d.account.page.username}</span></td>
                <td className={`p-3 font-medium ${d.status === "approved" ? "text-good" : "text-bad"}`}>
                  {t(`table.${d.status}`)}{d.reason && <span className="block text-xs font-normal text-muted">{t(`reasons.${d.reason}`)}</span>}
                </td>
                <td className="p-3" dir="ltr">{reviewers.find((r) => r.id === d.reviewedBy)?.email ?? "—"}</td>
                <td className="p-3">{d.reviewedAt ? age(d.reviewedAt, now, lang) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {decided.length === 0 && <p className="p-4 text-sm text-muted">{t("noneDecided")}</p>}
      </Card>
    );
  }

  // Oldest first: first come, first served. Master/detail as in the design.
  const [all, total, overdue, decidedToday, recent] = await Promise.all([
    db.verificationRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      // Enough to sort by the AI result; the list shows PAGE_SIZE.
      take: 200,
      include: { account: { select: { verificationStatus: true, verifiedUntil: true, page: { select: { username: true } } } } },
    }),
    db.verificationRequest.count({ where: { status: "pending" } }),
    db.verificationRequest.count({ where: { status: "pending", createdAt: { lt: new Date(now - REVIEW_HOURS * 3_600_000) } } }),
    db.verificationRequest.count({ where: { status: { in: ["approved", "rejected"] }, reviewedAt: { gte: new Date(now - (now % 86_400_000)) } } }),
    db.verificationRequest.findMany({ where: { reviewedAt: { gte: new Date(now - 7 * 86_400_000) } }, select: { createdAt: true, reviewedAt: true } }),
  ]);
  // AI result per request: "match" (username + followers fit), "check", or "none" (not read).
  const aiOf = (r: (typeof all)[number]) => (r.aiResult ? (compareRead(r.aiResult as AccountRead, r).overall === "match" ? "match" : "check") : "none");
  const aiCounts = { match: all.filter((r) => aiOf(r) === "match").length, check: all.filter((r) => aiOf(r) !== "match").length };
  const requests = all.filter((r) => !ai || (ai === "match" ? aiOf(r) === "match" : aiOf(r) !== "match")).slice(0, PAGE_SIZE);
  const avgHours = recent.length ? Math.round(recent.reduce((s, r) => s + (r.reviewedAt!.getTime() - r.createdAt.getTime()), 0) / recent.length / 3_600_000) : null;
  const stats = [
    { label: t("stats.pending"), value: formatNumber(total, lang) },
    { label: t("stats.overdue", { hours: REVIEW_HOURS }), value: formatNumber(overdue, lang), bad: overdue > 0 },
    { label: t("stats.today"), value: formatNumber(decidedToday, lang) },
    { label: t("stats.avg"), value: avgHours === null ? "—" : t("hours", { n: avgHours }) },
  ];
  const statsRow = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="flex flex-col gap-1 py-4">
          <span className="text-xs text-muted">{s.label}</span>
          <span className={`font-numbers text-2xl font-black ${s.bad ? "text-bad" : ""}`}>{s.value}</span>
        </Card>
      ))}
    </div>
  );

  const aiChips = (
    <nav aria-label={t("ai.filter")} className="flex flex-wrap gap-2 px-2 pt-1">
      {(["", "match", "check"] as const).map((k) => (
        <Link key={k || "all"} href={k ? `/admin/verifications?ai=${k}` : "/admin/verifications"} aria-current={ai === k ? "page" : undefined}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${ai === k ? "bg-navy text-white" : "bg-navy/5"}`}>
          {t(`ai.filters.${k || "all"}`)}{k && <span className="font-numbers opacity-70">{aiCounts[k]}</span>}
        </Link>
      ))}
    </nav>
  );

  if (requests.length === 0 && ai) {
    return (
      <>
        {statsRow}
        <Card className="flex flex-col gap-3">{aiChips}<p className="px-2 text-sm text-muted">{t("ai.noneInFilter")}</p></Card>
      </>
    );
  }
  if (requests.length === 0) {
    return (
      <>
        {statsRow}
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-good/10 text-good"><CheckCheck aria-hidden="true" size={26} /></span>
          <p className="font-bold">{t("emptyTitle")}</p>
          <p className="text-sm text-muted">{t("empty")}</p>
        </Card>
      </>
    );
  }

  const current = requests.find((r) => r.id === id) ?? requests[0];
  const item = {
    id: current.id,
    platform: current.platform,
    handle: current.handle,
    followers: formatNumber(current.followers, lang),
    profileUrl: profileUrl(current.platform, current.handle),
    username: current.account.page.username,
    // Only the open request gets a (10-minute) signed screenshot URL.
    screenshotUrl: await signedVerificationUrl(current.screenshotPath),
    waiting: age(current.createdAt, now, lang),
    overdue: now - current.createdAt.getTime() > REVIEW_HOURS * 3_600_000,
    renewal: current.account.verificationStatus === "verified" && !!current.account.verifiedUntil && current.account.verifiedUntil.getTime() > now,
    ai: current.aiResult
      ? { read: current.aiResult as AccountRead, comparison: compareRead(current.aiResult as AccountRead, current) }
      : null,
    aiAvailable: aiEnabled(),
  };

  return (
    <>
      {statsRow}
      <div className="grid items-start gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className={`flex flex-col gap-1 p-2 ${id ? "max-lg:hidden" : ""}`}>
          {aiChips}
          <p className="px-3 pt-2 pb-1 text-xs text-muted">{t("count", { shown: requests.length, total })}</p>
          <ul className="flex flex-col gap-1">
            {requests.map((r) => {
              const late = now - r.createdAt.getTime() > REVIEW_HOURS * 3_600_000;
              const selected = r.id === current.id;
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/verifications?${new URLSearchParams({ ...(ai && { ai }), id: r.id })}`} aria-current={selected ? "true" : undefined}
                    className={`flex min-h-[60px] items-center gap-3 rounded-[14px] px-3 py-2 ${selected ? "bg-navy/[0.06] ring-1 ring-navy/10" : "hover:bg-navy/[0.03]"}`}
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-navy/8"><PlatformIcon platform={r.platform} size={18} /></span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <bdi dir="ltr" className="truncate text-sm font-bold rtl:text-end">@{r.handle}</bdi>
                      <span className="truncate text-xs text-muted">{PLATFORM_NAMES[r.platform]} · <span className="font-numbers">{formatCompact(r.followers, lang)}</span></span>
                    </span>
                    {aiOf(r) !== "none" && (
                      <span title={t(`ai.badge.${aiOf(r)}`)} className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] font-bold ${aiOf(r) === "match" ? "bg-good/10 text-good" : "bg-warn/10 text-warn"}`}>
                        {aiOf(r) === "match" ? "✓ AI" : "! AI"}
                      </span>
                    )}
                    <span className={`flex shrink-0 items-center gap-1.5 text-[11px] ${late ? "font-bold text-bad" : "text-muted"}`}>
                      {late && <span aria-hidden="true" className="size-1.5 rounded-full bg-bad" />}{age(r.createdAt, now, lang)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className={`flex flex-col gap-3 ${id ? "" : "max-lg:hidden"}`}>
          {id && <Link href="/admin/verifications" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-blue lg:hidden">{t("backToList")}</Link>}
          <ReviewCard key={item.id} item={item} canDecide={can(admin, "verifications.decide")} />
        </div>
      </div>
    </>
  );
}

export default async function VerificationsPage({ params, searchParams }: PageProps<"/[locale]/admin/verifications">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  const t = await getTranslations("Admin.verifications");

  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("verifications")} subtitle={(await getTranslations("Admin.sub"))("verifications")} />
      <Suspense fallback={null}>
        <Tabs searchParams={searchParams} labels={{ pending: t("tabPending"), licenses: t("tabLicenses"), decided: t("tabDecided") }} />
      </Suspense>
      <Suspense fallback={null}>
        <QueueFromParams lang={locale} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Tab = "pending" | "licenses" | "decided";

async function tabOf(searchParams: Promise<Record<string, string | string[] | undefined>>): Promise<Tab> {
  const tab = (await searchParams).tab;
  return tab === "decided" || tab === "licenses" ? tab : "pending";
}

async function Tabs({ searchParams, labels }: { searchParams: Promise<Record<string, string | string[] | undefined>>; labels: Record<Tab, string> }) {
  const tab = await tabOf(searchParams);
  return (
    <div role="tablist" className="flex gap-2">
      {(["pending", "licenses", "decided"] as const).map((k) => (
        <Link
          key={k} role="tab" aria-selected={tab === k} href={k === "pending" ? "/admin/verifications" : `/admin/verifications?tab=${k}`}
          className={`inline-flex min-h-11 items-center rounded-full px-4 text-[13.5px] font-bold ${tab === k ? "bg-navy text-white" : "bg-white ring-1 ring-navy/10"}`}
        >
          {labels[k]}
        </Link>
      ))}
    </div>
  );
}

async function QueueFromParams({ lang, searchParams }: { lang: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id, ai } = await searchParams;
  return <Queue lang={lang} tab={await tabOf(searchParams)} id={typeof id === "string" ? id : ""} ai={ai === "match" || ai === "check" ? ai : ""} />;
}
