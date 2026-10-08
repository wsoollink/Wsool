import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { profileUrl } from "@/config/platforms";
import { REVIEW_HOURS } from "@/config/verification";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { signedVerificationUrl } from "@/lib/storage";
import { ReviewCard } from "./ReviewCard";

const PAGE_SIZE = 20;

/** "5 minutes ago" / "3 hours ago" / "2 days ago", in the panel language. */
function age(from: Date, now: number, lang: Locale) {
  const minutes = Math.max(1, Math.floor((now - from.getTime()) / 60_000));
  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(lang));
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? rtf.format(-hours, "hour") : rtf.format(-Math.floor(hours / 24), "day");
}

async function Queue({ lang, tab }: { lang: Locale; tab: "pending" | "decided" }) {
  const admin = await requireAdmin("verifications.view");
  const t = await getTranslations("Admin.verifications");
  const now = new Date().getTime();

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

  // Oldest first: first come, first served.
  const [requests, total] = await Promise.all([
    db.verificationRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: PAGE_SIZE,
      include: { account: { select: { verificationStatus: true, verifiedUntil: true, page: { select: { username: true } } } } },
    }),
    db.verificationRequest.count({ where: { status: "pending" } }),
  ]);
  if (requests.length === 0) return <Card><p className="text-sm text-muted">{t("empty")}</p></Card>;

  const items = await Promise.all(
    requests.map(async (r) => ({
      id: r.id,
      platform: r.platform,
      handle: r.handle,
      followers: formatNumber(r.followers, lang),
      profileUrl: profileUrl(r.platform, r.handle),
      username: r.account.page.username,
      screenshotUrl: await signedVerificationUrl(r.screenshotPath),
      waiting: age(r.createdAt, now, lang),
      overdue: now - r.createdAt.getTime() > REVIEW_HOURS * 3_600_000,
      renewal: r.account.verificationStatus === "verified" && !!r.account.verifiedUntil && r.account.verifiedUntil.getTime() > now,
    })),
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("count", { shown: items.length, total })}</p>
      {items.map((item) => <ReviewCard key={item.id} item={item} canDecide={can(admin, "verifications.decide")} />)}
    </div>
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
      <h1 className="text-2xl font-bold">{nav("verifications")}</h1>
      <Suspense fallback={null}>
        <Tabs searchParams={searchParams} labels={{ pending: t("tabPending"), decided: t("tabDecided") }} />
      </Suspense>
      <Suspense fallback={null}>
        <QueueFromParams lang={locale} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function tabOf(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  return (await searchParams).tab === "decided" ? "decided" : "pending";
}

async function Tabs({ searchParams, labels }: { searchParams: Promise<Record<string, string | string[] | undefined>>; labels: Record<"pending" | "decided", string> }) {
  const tab = await tabOf(searchParams);
  return (
    <div role="tablist" className="flex gap-2">
      {(["pending", "decided"] as const).map((k) => (
        <Link
          key={k} role="tab" aria-selected={tab === k} href={k === "pending" ? "/admin/verifications" : "/admin/verifications?tab=decided"}
          className={`min-h-11 content-center rounded-full px-4 text-sm font-medium ${tab === k ? "bg-navy text-white" : "border border-line bg-card"}`}
        >
          {labels[k]}
        </Link>
      ))}
    </div>
  );
}

async function QueueFromParams({ lang, searchParams }: { lang: Locale; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Queue lang={lang} tab={await tabOf(searchParams)} />;
}
