import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES } from "@/config/platforms";
import { verificationDisplay } from "@/config/verification";
import { isLocale, locales, toIntlLocale, type Locale } from "@/i18n/config";
import { can, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { planLabel } from "../plan";
import { UserActions } from "./UserActions";

// Placeholder id so the page shell can be prerendered; real ids render on request.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale, id: "_" }));
}

async function Details({ params, lang }: { params: Promise<{ id: string }>; lang: Locale }) {
  const { id } = await params;
  const admin = await requireAdmin("users.view");
  const t = await getTranslations("Admin.users");
  const v = await getTranslations("VerificationPage.status");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await db.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      page: { include: { socialAccounts: { orderBy: { sort: "asc" } }, translations: true } },
    },
  });
  if (!user) notFound();
  const history = await db.auditLog.findMany({ where: { targetType: "user", targetId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  const sub = user.subscription;
  const name = user.page?.translations.find((x) => x.lang === user.page?.primaryLang)?.fullName;

  const rows: [string, React.ReactNode][] = [
    [t("email"), <span key="e" dir="ltr">{user.email}</span>],
    [t("joined"), date.format(user.createdAt)],
    [t("planLabel"), t(`plan.${planLabel(sub)}`)],
    ...(sub?.trialEndsAt ? [[t("trialEnds"), date.format(sub.trialEndsAt)] as [string, React.ReactNode]] : []),
    [t("pageLabel"), user.page ? <a key="p" href={`/${user.page.username}`} target="_blank" rel="noopener noreferrer" dir="ltr" className="text-blue underline">/{user.page.username}</a> : t("noPage")],
    ...(user.page ? [[t("pageStatus"), user.page.isPublished ? t("published") : t("hidden")] as [string, React.ReactNode]] : []),
    ...(user.suspendedAt ? [[t("suspended"), date.format(user.suspendedAt)] as [string, React.ReactNode]] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{name || user.page?.username || user.email}</h1>
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="font-medium">{value}</dd></div>
          ))}
        </dl>
      </Card>

      {user.page && user.page.socialAccounts.length > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="font-bold">{t("accounts")}</h2>
          <ul className="flex flex-col divide-y divide-line">
            {user.page.socialAccounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <PlatformIcon platform={a.platform} size={18} /> {PLATFORM_NAMES[a.platform]}
                <span dir="ltr" className="text-muted">@{a.handle}</span>
                <span className="ms-auto">{formatNumber(a.followers, lang)}</span>
                <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs">{v(verificationDisplay(a.verificationStatus, a.verifiedUntil))}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <UserActions
        userId={user.id}
        can={{ trial: can(admin, "trial.extend"), suspend: can(admin, "users.suspend"), edit: can(admin, "users.edit") }}
        paid={sub?.status === "active"}
        suspended={!!user.suspendedAt}
        published={user.page ? user.page.isPublished : null}
        self={user.id === admin.userId}
      />

      <Card className="flex flex-col gap-2">
        <h2 className="font-bold">{t("history")}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t("noHistory")}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-3">
                <span className="font-medium">{t(`log.${h.action}`)}</span>
                <span className="text-muted" dir="ltr">{h.actorEmail}</span>
                <span className="text-muted">{date.format(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default async function UserPage({ params }: PageProps<"/[locale]/admin/users/[id]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Admin.users");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/users" className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted hover:text-navy">
        <ArrowRight aria-hidden="true" size={16} className="ltr:rotate-180" /> {t("back")}
      </Link>
      <Suspense fallback={null}><Details params={params} lang={locale} /></Suspense>
    </div>
  );
}
