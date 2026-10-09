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
export function AdminNav({ allowed, variant, pending }: { allowed: AdminSectionKey[]; variant: "sidebar" | "row"; pending: number }) {
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
              className={`flex min-h-[46px] items-center gap-3 rounded-[14px] px-3 text-[14.5px] whitespace-nowrap transition-colors ${
                active ? "bg-navy font-bold text-white" : "font-medium text-muted hover:bg-navy/5 hover:text-navy"
              }`}
            >
              <Icon aria-hidden="true" size={18} />
              <span className="flex-1">{t(s.key)}</span>
              {s.key === "verifications" && pending > 0 && (
                <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-blue px-1.5 text-xs font-bold text-white">
                  {pending}<span className="sr-only"> {t("pendingBadge")}</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
