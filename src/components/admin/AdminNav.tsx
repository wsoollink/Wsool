"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, ChartPie, CreditCard, LayoutDashboard, Mail, ScrollText, Shapes, TicketPercent, ShieldCheck, Users, Wallet, type LucideIcon } from "lucide-react";
import { ADMIN_SECTIONS, type AdminSectionKey } from "@/config/admin";
import { navRow, navRowActive } from "@/components/ui/styles";

const ICONS: Record<AdminSectionKey, LucideIcon> = {
  overview: LayoutDashboard,
  verifications: BadgeCheck,
  users: Users,
  insights: ChartPie,
  subscriptions: CreditCard,
  finance: Wallet,
  newsletter: Mail,
  discounts: TicketPercent,
  categories: Shapes,
  team: ShieldCheck,
  audit: ScrollText,
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Admin sections the signed-in staff member may open (sidebar and phone menu); owner-only ones under an "Owner" label. */
export function AdminNav({ allowed, pending }: { allowed: AdminSectionKey[]; pending: number }) {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname().replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
  const sections = ADMIN_SECTIONS.filter((s) => allowed.includes(s.key));
  const item = (s: (typeof sections)[number]) => {
    const active = isActive(pathname, s.href);
    const Icon = ICONS[s.key];
    return (
      <li key={s.key}>
        <Link href={s.href} aria-current={active ? "page" : undefined} className={`${navRow} ${active ? navRowActive : ""}`}>
          <Icon aria-hidden="true" size={17} />
          <span className="flex-1">{t(s.key)}</span>
          {s.key === "verifications" && pending > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue/10 px-1.5 text-[11px] font-bold text-blue">
              {pending}<span className="sr-only"> {t("pendingBadge")}</span>
            </span>
          )}
        </Link>
      </li>
    );
  };
  const staff = sections.filter((s) => s.permission !== "owner");
  const owner = sections.filter((s) => s.permission === "owner");
  return (
    <>
      <ul className="flex flex-col gap-0.5">{staff.map(item)}</ul>
      {owner.length > 0 && (
        <>
          <p className="px-2.5 pt-4 pb-1.5 text-[11px] font-semibold text-muted">{t("groupOwner")}</p>
          <ul className="flex flex-col gap-0.5">{owner.map(item)}</ul>
        </>
      )}
    </>
  );
}
