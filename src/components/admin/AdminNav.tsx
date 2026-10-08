"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, CreditCard, LayoutDashboard, ScrollText, ShieldCheck, Users, Wallet, type LucideIcon } from "lucide-react";
import { ADMIN_SECTIONS, type AdminSectionKey } from "@/config/admin";

const ICONS: Record<AdminSectionKey, LucideIcon> = {
  overview: LayoutDashboard,
  verifications: BadgeCheck,
  users: Users,
  subscriptions: CreditCard,
  finance: Wallet,
  team: ShieldCheck,
  audit: ScrollText,
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Admin sections the signed-in staff member may open. Sidebar on desktop, scrolling row on mobile. */
export function AdminNav({ allowed, variant }: { allowed: AdminSectionKey[]; variant: "sidebar" | "row" }) {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname().replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
  const sections = ADMIN_SECTIONS.filter((s) => allowed.includes(s.key));
  return (
    <ul className={variant === "sidebar" ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto px-4 pb-2"}>
      {sections.map((s) => {
        const active = isActive(pathname, s.href);
        const Icon = ICONS[s.key];
        return (
          <li key={s.key} className="shrink-0">
            <Link
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                active ? "bg-blue/10 text-blue" : "text-navy hover:bg-navy/5"
              }`}
            >
              <Icon aria-hidden="true" size={18} />
              {t(s.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
