"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DASHBOARD_SECTIONS } from "@/config/dashboard";
import { navRow, navRowActive } from "@/components/ui/styles";
import { SectionIcon } from "./SectionIcon";

/**
 * usePathname() can return the internal rewritten path (/en/dashboard/...)
 * during server rendering; drop the locale so it matches the public URL.
 */
export function usePublicPathname() {
  return usePathname().replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Every section, page sections first, then the "Account" group: desktop sidebar and the phone menu (which closes on tap). */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("DashboardNav");
  const pathname = usePublicPathname();
  const item = (s: (typeof DASHBOARD_SECTIONS)[number]) => {
    const active = isActive(pathname, s.href);
    return (
      <li key={s.key}>
        <Link href={s.href} aria-current={active ? "page" : undefined} onClick={onNavigate} className={`${navRow} ${active ? navRowActive : ""}`}>
          <SectionIcon section={s.key} size={17} />
          {t(s.key)}
        </Link>
      </li>
    );
  };
  return (
    <>
      <ul className="flex flex-col gap-0.5">{DASHBOARD_SECTIONS.filter((s) => !("group" in s)).map(item)}</ul>
      <p className="px-2.5 pt-4 pb-1.5 text-[11px] font-semibold text-muted">{t("groupAccount")}</p>
      <ul className="flex flex-col gap-0.5">{DASHBOARD_SECTIONS.filter((s) => "group" in s).map(item)}</ul>
    </>
  );
}
