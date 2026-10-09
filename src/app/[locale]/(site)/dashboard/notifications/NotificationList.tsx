"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, Bell, CalendarClock, CheckCheck, CreditCard, Gift, Trash2, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { markAllRead, markRead } from "./actions";

export type NotificationItem = { id: string; type: string; title: string; body: string; href: string; cta: string | null; time: string; group: "today" | "week" | "older"; unread: boolean };

function iconFor(type: string) {
  if (type.startsWith("verification_approved") || type === "license_verified") return { Icon: BadgeCheck, tone: "bg-good/10 text-good" };
  if (type.includes("rejected") || type === "payment_failed") return { Icon: TriangleAlert, tone: "bg-bad/8 text-bad" };
  if (type.includes("expir") || type.includes("reminder") || type === "renewal_upcoming") return { Icon: CalendarClock, tone: "bg-warn/10 text-warn" };
  if (type.includes("receipt") || type.includes("refund") || type.includes("subscription")) return { Icon: CreditCard, tone: "bg-blue/10 text-blue" };
  if (type === "welcome") return { Icon: Gift, tone: "bg-blue/10 text-blue" };
  if (type === "deletion_scheduled") return { Icon: Trash2, tone: "bg-bad/8 text-bad" };
  return { Icon: Bell, tone: "bg-navy/5 text-navy" };
}

/** Filters (all / unread), mark all read, items grouped by today / this week / older (dashboard design). */
export function NotificationList({ items }: { items: NotificationItem[] }) {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [, startTransition] = useTransition();
  const unread = items.filter((n) => n.unread).length;
  const shown = filter === "unread" ? items.filter((n) => n.unread) : items;
  const refresh = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); router.refresh(); });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={t("filter")} className="grid grid-cols-2 gap-1 rounded-[14px] bg-navy/5 p-1">
          {(["all", "unread"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[13.5px] font-bold ${filter === f ? "bg-white text-navy shadow-card" : "text-muted"}`}>
              {t(f)}
              {f === "unread" && unread > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue px-1.5 text-[11.5px] text-white">{unread}</span>}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <button type="button" onClick={() => refresh(markAllRead)} className="inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-bold text-blue">
            <CheckCheck aria-hidden="true" size={18} /> {t("markAll")}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-1 py-8 text-center">
          <Bell aria-hidden="true" size={28} className="text-muted" />
          <span className="text-[15px] font-bold">{filter === "unread" ? t("noUnread") : t("empty")}</span>
          {filter === "unread" && <span className="text-[13px] text-muted">{t("allGood")}</span>}
        </Card>
      ) : (
        (["today", "week", "older"] as const).map((g) => {
          const group = shown.filter((n) => n.group === g);
          if (!group.length) return null;
          return (
            <section key={g} className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-muted">{t(`groups.${g}`)}</h2>
              <Card className="flex flex-col divide-y divide-navy/6 p-0">
                {group.map((n) => {
                  const { Icon, tone } = iconFor(n.type);
                  return (
                    <div key={n.id} className={`relative flex gap-3 p-4 ${n.unread ? "bg-blue/[0.03]" : ""}`}>
                      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon aria-hidden="true" size={20} /></span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`text-[14.5px] ${n.unread ? "font-bold" : "font-medium"}`}>{n.unread && <span className="sr-only">{t("new")}: </span>}{n.title}</span>
                          <span className="shrink-0 text-xs text-muted">{n.time}</span>
                        </div>
                        <span className="text-[13px] whitespace-pre-line text-muted">{n.body}</span>
                        <div className="flex items-center gap-4">
                          {n.cta && (
                            <Link href={n.href} onClick={() => n.unread && markRead(n.id)} className="inline-flex min-h-11 items-center text-[13px] font-bold text-blue">{n.cta}</Link>
                          )}
                          {n.unread && (
                            <button type="button" onClick={() => refresh(() => markRead(n.id))} className="inline-flex min-h-11 items-center text-[12.5px] text-muted">{t("markRead")}</button>
                          )}
                        </div>
                      </div>
                      {n.unread && <span aria-hidden="true" className="absolute end-4 top-4 size-[9px] rounded-full bg-blue" />}
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
