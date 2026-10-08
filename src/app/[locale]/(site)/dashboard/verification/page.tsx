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

async function Accounts() {
  const { user, page } = await requireCreator();
  const t = await getTranslations("VerificationPage");
  // Scoped to the creator's own page from the verified session.
  const [accounts, sub] = await Promise.all([
    db.socialAccount.findMany({
      where: { pageId: page.id },
      orderBy: { sort: "asc" },
      include: { verificationRequests: { where: { status: { in: ["pending", "approved", "rejected"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.subscription.findUnique({ where: { userId: user.id }, select: { status: true, trialEndsAt: true } }),
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
      <VerificationList accounts={toVerifyAccounts(accounts)} />
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
      <h1 className="text-2xl font-bold">{nav("verification")}</h1>
      <Card className="flex flex-col gap-2">
        <h2 className="font-bold">{t("howTitle")}</h2>
        <ol className="list-decimal space-y-1 ps-5 text-sm text-muted">
          <li>{t("how1")}</li>
          <li>{t("how2")}</li>
          <li>{t("how3")}</li>
        </ol>
      </Card>
      <Suspense fallback={null}>
        <Accounts />
      </Suspense>
    </div>
  );
}
