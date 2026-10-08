import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { SubmitButton } from "@/components/SubmitButton";
import { ADMIN_SECTIONS } from "@/config/admin";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { can, getAdmin } from "@/lib/admin";
import { signOut } from "../login/actions";

/** Only the sections this staff member may open; nothing for everyone else. */
async function Nav({ variant }: { variant: "sidebar" | "row" }) {
  const admin = await getAdmin();
  if (!admin) return null;
  const allowed = ADMIN_SECTIONS.filter((s) => !s.permission || can(admin, s.permission)).map((s) => s.key);
  return <AdminNav allowed={allowed} variant={variant} />;
}

// Each page checks access itself through requireAdmin().
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Admin");
  const nav = await getTranslations("DashboardNav");

  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-e border-line bg-card p-4 md:flex">
        <Link href="/admin" className="px-3 pt-2 text-xl font-bold">
          <span className="brand-gradient bg-clip-text text-transparent">{nav("brand")}</span> <span className="text-sm text-muted">{t("panel")}</span>
        </Link>
        <nav aria-label={t("menu")} className="flex-1 overflow-y-auto">
          <Suspense fallback={null}><Nav variant="sidebar" /></Suspense>
        </nav>
        <form action={signOut}>
          <SubmitButton variant="secondary" className="w-full" pendingText={nav("signingOut")}>
            <LogOut aria-hidden="true" size={18} />
            {nav("signOut")}
          </SubmitButton>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="text-lg font-bold">
              <span className="brand-gradient bg-clip-text text-transparent">{nav("brand")}</span> <span className="text-sm text-muted">{t("panel")}</span>
            </Link>
            <form action={signOut}>
              <button type="submit" aria-label={nav("signOut")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-navy/5">
                <LogOut aria-hidden="true" size={18} />
              </button>
            </form>
          </div>
          <nav aria-label={t("menu")}>
            <Suspense fallback={null}><Nav variant="row" /></Suspense>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-10">{children}</main>
      </div>
    </div>
  );
}
