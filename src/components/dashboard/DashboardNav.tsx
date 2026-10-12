"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DASHBOARD_SECTIONS } from "@/config/dashboard";
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

/** List of every section: desktop sidebar and the phone menu (which closes on tap). */
export function SidebarNav({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  const t = useTranslations("DashboardNav");
  const pathname = usePublicPathname();
  return (
    <ul className={`flex flex-col ${compact ? "" : "gap-1"}`}>
      {DASHBOARD_SECTIONS.map((s) => {
        const active = isActive(pathname, s.href);
        return (
          <li key={s.key}>
            <Link
              href={s.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
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
