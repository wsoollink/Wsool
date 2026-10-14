import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { can, getAdmin } from "@/lib/admin";

/** Creator search (name, link or email) in the admin top bar: opens the Users list filtered. Only for staff who can see users. */
export async function CreatorSearch() {
  const admin = await getAdmin();
  if (!admin || !can(admin, "users.view")) return null;
  const t = await getTranslations("Admin");
  return (
    <form action="/admin/users" role="search" className="relative w-full max-w-[420px]">
      <Search aria-hidden="true" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
      <input
        type="search" name="q" aria-label={t("searchLabel")} placeholder={t("searchPlaceholder")}
        className="h-11 w-full rounded-[10px] border border-line bg-bg ps-9 pe-3 text-[13px] outline-none placeholder:text-muted focus:border-blue focus:bg-card focus:ring-3 focus:ring-blue/15 md:h-9"
      />
    </form>
  );
}

/** Admin page title row: title, subtitle, optional actions (the search lives in the top bar). */
export function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 md:mb-6 print:mb-2">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[21px] leading-tight font-bold tracking-[-0.01em] md:text-2xl">{title}</h1>
        {subtitle && <p className="text-[13.5px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
