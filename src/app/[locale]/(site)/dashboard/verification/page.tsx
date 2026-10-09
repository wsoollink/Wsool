import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hasPro } from "@/config/plans";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { toVerifyAccounts } from "./accounts";
import { VerificationList } from "./VerificationList";
import { PageHeader } from "@/components/dashboard/PageHeader";

async function Accounts() {
  const { user, page } = await requireCreator();
  const t = await getTranslations("VerificationPage");
  // Scoped to the creator's own page from the verified session.
  const [accounts, sub, licenses] = await Promise.all([
    db.socialAccount.findMany({
      where: { pageId: page.id },
      orderBy: { sort: "asc" },
      include: { verificationRequests: { where: { status: { in: ["pending", "approved", "rejected"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } }),
    db.license.findMany({ where: { pageId: page.id }, orderBy: { sort: "asc" } }),
  ]);

  if (accounts.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted">{t("noAccounts")}</p>
        <Link href="/dashboard/accounts" className={buttonClasses("secondary")}>{t("goToAccounts")}</Link>
      </Card>
    );
  }

  return (
    <>
      {!hasPro(sub) && <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">{t("freeNote")}</p>}
      <VerificationList
        accounts={toVerifyAccounts(accounts)}
        licenses={licenses.map((l) => ({
          id: l.id, name: l.name, number: l.number, hasFile: !!l.fileUrl, rejectReason: l.rejectReason,
          status: l.verificationStatus === "verified" || l.verificationStatus === "in_review" || l.verificationStatus === "rejected" ? l.verificationStatus : "none",
        }))}
      />
    </>
  );
}

export default async function VerificationPage({ params }: PageProps<"/[locale]/dashboard/verification">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("DashboardNav");
  const t = await getTranslations("VerificationPage");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={nav("verification")} section="verification" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Suspense fallback={null}>
            <Accounts />
          </Suspense>
        </div>
        <Card className="flex flex-col gap-3 lg:sticky lg:top-6">
          <h2 className="font-bold">{t("howTitle")}</h2>
          <ol className="flex flex-col gap-3">
            {(["1", "2", "3"] as const).map((n) => (
              <li key={n} className="flex gap-3">
                <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-navy/5 text-[13px] font-bold">{n}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">{t(`step${n}Title`)}</span>
                  <span className="text-[12.5px] text-muted">{t(`step${n}Body`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
