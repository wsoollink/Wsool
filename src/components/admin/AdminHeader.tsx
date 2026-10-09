import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { can, getAdmin } from "@/lib/admin";

/** Creator search (name, link or email) that opens the Users list filtered; only for staff who can see users. */
async function SearchBox() {
  const admin = await getAdmin();
  if (!admin || !can(admin, "users.view")) return null;
  const t = await getTranslations("Admin");
  return (
    <form action="/admin/users" role="search" className="relative w-full sm:w-80">
      <Search aria-hidden="true" size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search" name="q" aria-label={t("searchLabel")} placeholder={t("searchPlaceholder")}
        className="h-[46px] w-full rounded-full border border-navy/10 bg-white ps-11 pe-4 text-sm"
      />
    </form>
  );
}

/** Admin page header from the design: big title, subtitle, and the creator search box. */
export function AdminHeader({ title, subtitle, search = true }: { title: string; subtitle?: string; search?: boolean }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-tight font-black">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {search && <Suspense fallback={null}><SearchBox /></Suspense>}
    </header>
  );
}
