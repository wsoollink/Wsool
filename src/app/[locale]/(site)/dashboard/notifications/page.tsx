import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale, type Locale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { notificationText } from "@/lib/notify";
import { EmailSettings } from "./EmailSettings";
import { NotificationList } from "./NotificationList";
import { today } from "@/lib/analytics";
import { PageHeader } from "@/components/dashboard/PageHeader";

async function List({ lang }: { lang: Locale }) {
  const { user } = await requireCreator();
  const [items, settings] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.notificationSettings.findUnique({ where: { userId: user.id } }),
  ]);
  const time = new Intl.DateTimeFormat(toIntlLocale(lang), { hour: "numeric", minute: "2-digit" });
  const day = new Intl.DateTimeFormat(toIntlLocale(lang), { day: "numeric", month: "short" });
  const startOfToday = today().getTime();
  const list = items.flatMap((n) => {
    const text = notificationText(n.type, n.data, lang);
    if (!text) return [];
    const at = n.createdAt.getTime();
    const group = at >= startOfToday ? "today" : at >= startOfToday - 6 * 86_400_000 ? "week" : "older";
    return [{ id: n.id, type: n.type, title: text.title, body: text.body, href: text.href, cta: text.cta ?? null, time: group === "today" ? time.format(n.createdAt) : day.format(n.createdAt), group, unread: !n.readAt } as const];
  });

  return (
    <div className="flex flex-col gap-4">
      <NotificationList items={list} />
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
