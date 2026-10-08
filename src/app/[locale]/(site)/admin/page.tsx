import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { REVIEW_HOURS } from "@/config/verification";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";

async function Stats({ lang }: { lang: Locale }) {
  const admin = await requireAdmin();
  const t = await getTranslations("Admin.overview");
  const now = new Date();
  const [users, published, trialing, pro, pending, overdue] = await Promise.all([
    db.user.count(),
    db.page.count({ where: { isPublished: true, deletedAt: null } }),
    db.subscription.count({ where: { status: "trialing", trialEndsAt: { gt: now } } }),
    db.subscription.count({ where: { status: "active" } }),
    db.verificationRequest.count({ where: { status: "pending" } }),
    db.verificationRequest.count({ where: { status: "pending", createdAt: { lt: new Date(now.getTime() - REVIEW_HOURS * 3_600_000) } } }),
  ]);
  const tiles = [
    { label: t("users"), value: users },
    { label: t("published"), value: published },
    { label: t("trialing"), value: trialing },
    { label: t("pro"), value: pro },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1">
            <span className="text-xs text-muted">{tile.label}</span>
            <span className="font-numbers text-3xl font-bold">{formatNumber(tile.value, lang)}</span>
          </Card>
        ))}
      </div>
      {can(admin, "verifications.view") && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">{t("pending", { n: formatNumber(pending, lang) })}</p>
            <p className={`text-sm ${overdue ? "text-bad" : "text-muted"}`}>{overdue ? t("overdue", { n: formatNumber(overdue, lang), hours: REVIEW_HOURS }) : t("onTime")}</p>
          </div>
          <Link href="/admin/verifications" className="min-h-11 content-center rounded-full bg-navy px-5 text-sm font-semibold text-white">{t("openQueue")}</Link>
        </Card>
      )}
    </div>
  );
}

export default async function AdminOverview({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("overview")}</h1>
      <Suspense fallback={null}><Stats lang={locale} /></Suspense>
    </div>
  );
}
