import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { notificationText } from "@/lib/notify";
import { EmailSettings } from "./EmailSettings";
import { MarkRead } from "./MarkRead";
import { PageHeader } from "@/components/dashboard/PageHeader";

async function List({ lang }: { lang: Locale }) {
  const { user } = await requireCreator();
  const t = await getTranslations("Notifications");
  const [items, settings] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.notificationSettings.findUnique({ where: { userId: user.id } }),
  ]);
  const date = new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col gap-4">
      <MarkRead unread={unread} />
      {items.length === 0 ? (
        <Card><p className="text-sm text-muted">{t("empty")}</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const text = notificationText(n.type, n.data, lang);
            if (!text) return null;
            return (
              <li key={n.id}>
                <Link href={text.href} className={`flex gap-3 rounded-2xl border bg-card p-4 hover:border-blue ${n.readAt ? "border-line" : "border-blue/40"}`}>
                  <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-blue"}`} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">{!n.readAt && <span className="sr-only">{t("new")}: </span>}{text.title}</span>
                    <span className="text-sm whitespace-pre-line text-muted">{text.body}</span>
                    <span className="text-xs text-muted">{date.format(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <EmailSettings initial={{ reminders: settings?.emailReminders ?? true, productNews: settings?.emailProductNews ?? true }} />
    </div>
  );
}

export default async function NotificationsPage({ params }: PageProps<"/[locale]/dashboard/notifications">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const nav = await getTranslations("DashboardNav");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={nav("notifications")} section="notifications" />
      <Suspense fallback={null}><List lang={locale} /></Suspense>
    </div>
  );
}
