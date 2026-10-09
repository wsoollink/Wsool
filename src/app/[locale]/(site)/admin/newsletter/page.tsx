import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { audienceCounts } from "@/lib/newsletter-campaign";
import { NewCampaignButton } from "./NewCampaignButton";
import { statusTone } from "./status";

/** Subscriber numbers, CSV export, and the list of issues (newest first). */
async function Newsletter({ lang }: { lang: Locale }) {
  const admin = await requireAdmin("newsletter.send");
  const t = await getTranslations("Admin.newsletter");
  const [counts, campaigns] = await Promise.all([
    audienceCounts(),
    db.newsletterCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, subjectAr: true, subjectEn: true, status: true, createdAt: true, sentAt: true, sentCount: true, failedCount: true } }),
  ]);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" });
  const tiles = [
    { label: t("confirmed"), value: counts.confirmed },
    { label: t("ar"), value: counts.ar },
    { label: t("en"), value: counts.en },
    { label: t("pending"), value: counts.pending },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted">{tile.label}</span>
            <span className="font-numbers text-[28px] leading-none">{formatNumber(tile.value, lang)}</span>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NewCampaignButton label={t("newCampaign")} />
        {can(admin, "users.view") && (
          // A route handler download, not a page: plain <a>.
          <a href="/api/admin/newsletter" download className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy/5 px-5 text-sm font-bold">
            <Download aria-hidden="true" size={16} /> {t("exportCsv")}
          </a>
        )}
        {counts.unsubscribed > 0 && <p className="text-xs text-muted">{t("unsubscribedNote", { n: formatNumber(counts.unsubscribed, lang) })}</p>}
      </div>

      <Card className="flex flex-col gap-1 p-2">
        <h2 className="px-3 pt-2 pb-1 font-bold">{t("campaigns")}</h2>
        {campaigns.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/newsletter/edit?id=${c.id}`} className="flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-1 rounded-[14px] px-3 py-2 hover:bg-navy/[0.03]">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.subjectAr || c.subjectEn || t("untitled")}</span>
                  {c.status !== "draft" && (
                    <span className="text-xs text-muted">
                      {t("sentTo", { n: formatNumber(c.sentCount, lang) })}
                      {c.failedCount > 0 && <span className="text-bad"> · {t("failedN", { n: formatNumber(c.failedCount, lang) })}</span>}
                    </span>
                  )}
                  <span className="text-xs text-muted">{date.format(c.sentAt ?? c.createdAt)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[c.status]}`}>{t(`status.${c.status}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default async function NewsletterPage({ params }: PageProps<"/[locale]/admin/newsletter">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("Admin.nav");
  return (
    <div className="flex flex-col gap-4">
      <AdminHeader title={nav("newsletter")} subtitle={(await getTranslations("Admin.sub"))("newsletter")} search={false} />
      <Suspense fallback={null}><Newsletter lang={locale} /></Suspense>
    </div>
  );
}
