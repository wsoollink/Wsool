"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DASHBOARD_SECTIONS, TAB_BAR, MORE_SECTIONS } from "@/config/dashboard";
import { SectionIcon } from "./SectionIcon";

/**
 * usePathname() can return the internal rewritten path (/en/dashboard/...)
 * during server rendering; drop the locale so it matches the public URL.
 */
function usePublicPathname() {
  return usePathname().replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar list of every section. */
export function SidebarNav() {
  const t = useTranslations("DashboardNav");
  const pathname = usePublicPathname();
  return (
    <ul className="flex flex-col gap-1">
      {DASHBOARD_SECTIONS.map((s) => {
        const active = isActive(pathname, s.href);
        return (
          <li key={s.key}>
            <Link
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                active ? "bg-navy/5 font-bold text-navy" : "font-medium text-muted hover:bg-navy/5 hover:text-navy"
              }`}
            >
              <SectionIcon section={s.key} />
              {t(s.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Mobile bottom tab bar. "More" stays active for the sections it lists. */
export function TabBar() {
  const t = useTranslations("DashboardNav");
  const pathname = usePublicPathname();
  const inMore = MORE_SECTIONS.some((s) => isActive(pathname, s.href));
  return (
    <ul className="grid grid-cols-5">
      {TAB_BAR.map((tab) => {
        const active = isActive(pathname, tab.href) || (tab.key === "more" && inMore);
        return (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11.5px] ${
                active ? "font-bold text-blue" : "font-medium text-muted"
              }`}
            >
              <SectionIcon section={tab.key} />
              {t(tab.label ?? tab.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
