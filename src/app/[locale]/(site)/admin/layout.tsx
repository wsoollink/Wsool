import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeMenuItem, ThemeToggle } from "@/components/ThemeToggle";
import { CreatorSearch } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { LangPill } from "@/components/dashboard/LangPill";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { navRow, topBar } from "@/components/ui/styles";
import { ADMIN_SECTIONS } from "@/config/admin";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { can, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { signOut } from "../login/actions";

/** Only the sections this staff member may open; nothing for everyone else. */
async function Nav() {
  const admin = await getAdmin();
  if (!admin) return null;
  const allowed = ADMIN_SECTIONS.filter((s) => !s.permission || can(admin, s.permission)).map((s) => s.key);
  // Badge on "Verification requests": accounts + licenses waiting.
  const pending = can(admin, "verifications.view")
    ? (await Promise.all([db.verificationRequest.count({ where: { status: "pending" } }), db.license.count({ where: { verificationStatus: "in_review" } })])).reduce((a, b) => a + b, 0)
    : 0;
  return <AdminNav allowed={allowed} pending={pending} />;
}

/** Who is signed in (bottom of the sidebar). */
async function Me() {
  const admin = await getAdmin();
  if (!admin) return null;
  const t = await getTranslations("Admin");
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-2.5 shadow-card">
      <span aria-hidden="true" className="brand-gradient inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white uppercase">{admin.email[0]}</span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span dir="ltr" className="truncate text-[12.5px] font-bold rtl:text-end">{admin.email}</span>
        <span className="text-[11.5px] text-muted">{admin.isOwner ? t("roleOwner") : t("roleStaff")}</span>
      </span>
    </div>
  );
}

// Each page checks access itself through requireAdmin().
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Admin");
  const nav = await getTranslations("DashboardNav");
  const logo = locale === "en" ? "en" : "ar";
  const badge = <span className="inline-flex h-[22px] items-center rounded-full bg-hover px-2.5 text-[11px] font-semibold text-muted">{t("panel")}</span>;
  const signOutRow = (
    <form action={signOut}>
      <button type="submit" className={`${navRow} w-full`}>
        <LogOut aria-hidden="true" size={17} />
        {nav("signOut")}
      </button>
    </form>
  );

  return (
    <div className="app-backdrop flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-3 border-e border-line px-3 pt-4 pb-3 md:flex print:hidden">
        <Link href="/admin" className="flex min-h-10 items-center justify-between gap-2 px-2.5" aria-label={`${nav("brand")} ${t("panel")}`}>
          <BrandLogo lang={logo} alt="" className="h-7 w-auto" priority />
          {badge}
        </Link>
        <nav aria-label={t("menu")} className="-mx-1 flex-1 overflow-y-auto px-1 pt-1">
          <Suspense fallback={null}><Nav /></Suspense>
        </nav>
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          {signOutRow}
          <Suspense fallback={null}><Me /></Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={topBar}>
          <MobileMenu
            home="/admin"
            nav={<Suspense fallback={null}><Nav /></Suspense>}
            footer={<><ThemeMenuItem className={`${navRow} w-full`} />{signOutRow}</>}
          />
          <Link href="/admin" className="flex min-h-11 items-center gap-2 md:hidden" aria-label={`${nav("brand")} ${t("panel")}`}>
            <BrandLogo lang={logo} alt="" className="h-[24px] w-auto" />
            {badge}
          </Link>
          <div className="hidden flex-1 md:block"><Suspense fallback={null}><CreatorSearch /></Suspense></div>
          <span className="flex-1 md:hidden" />
          <ThemeToggle bare className="hidden md:inline-flex" />
          <LangPill current={locale} />
        </header>
        <main className="w-full flex-1 px-4 pt-5 pb-10 md:px-8 md:pt-7 print:p-0">{children}</main>
      </div>
    </div>
  );
}
