import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { SubmitButton } from "@/components/SubmitButton";
import { ADMIN_SECTIONS } from "@/config/admin";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { can, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { signOut } from "../login/actions";

/** Only the sections this staff member may open; nothing for everyone else. */
async function Nav({ variant }: { variant: "sidebar" | "row" }) {
  const admin = await getAdmin();
  if (!admin) return null;
  const allowed = ADMIN_SECTIONS.filter((s) => !s.permission || can(admin, s.permission)).map((s) => s.key);
  // Badge on "Verification requests": accounts + licenses waiting.
  const pending = can(admin, "verifications.view")
    ? (await Promise.all([db.verificationRequest.count({ where: { status: "pending" } }), db.license.count({ where: { verificationStatus: "in_review" } })])).reduce((a, b) => a + b, 0)
    : 0;
  return <AdminNav allowed={allowed} variant={variant} pending={pending} />;
}

/** Who is signed in (design: profile card at the bottom of the sidebar). */
async function Me() {
  const admin = await getAdmin();
  if (!admin) return null;
  const t = await getTranslations("Admin");
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-bg p-3">
      <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white uppercase">{admin.email[0]}</span>
      <span className="flex min-w-0 flex-col">
        <span dir="ltr" className="truncate text-[13px] font-bold rtl:text-end">{admin.email}</span>
        <span className="text-xs text-muted">{admin.isOwner ? t("roleOwner") : t("roleStaff")}</span>
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

  return (
    <div className="flex min-h-dvh flex-1 bg-bg">
      <aside className="sticky top-0 hidden print:hidden h-dvh w-[260px] shrink-0 flex-col gap-6 border-e border-navy/8 bg-white px-4 py-6 md:flex">
        <Link href="/admin" className="flex min-h-11 items-center gap-2 px-2" aria-label={`${nav("brand")} ${t("panel")}`}>
          <Image src={locale === "en" ? "/brand/logo-en.png" : "/brand/logo-ar.png"} alt="" width={90} height={30} className="h-[30px] w-auto" priority />
          <span className="inline-flex h-6 items-center rounded-full bg-[#EEF3FB] px-2.5 text-[11.5px] font-bold text-blue">{t("panel")}</span>
        </Link>
        <nav aria-label={t("menu")} className="flex-1 overflow-y-auto">
          <Suspense fallback={null}><Nav variant="sidebar" /></Suspense>
        </nav>
        <div className="flex flex-col gap-2">
          <Suspense fallback={null}><Me /></Suspense>
          <form action={signOut}>
            <SubmitButton variant="secondary" className="w-full" pendingText={nav("signingOut")}>
              <LogOut aria-hidden="true" size={18} />
              {nav("signOut")}
            </SubmitButton>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-navy/8 bg-white/90 backdrop-blur md:hidden print:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src={locale === "en" ? "/brand/logo-en.png" : "/brand/logo-ar.png"} alt={nav("brand")} width={78} height={26} className="h-[26px] w-auto" />
              <span className="inline-flex h-6 items-center rounded-full bg-[#EEF3FB] px-2.5 text-[11.5px] font-bold text-blue">{t("panel")}</span>
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
        <main className="w-full flex-1 px-4 pt-6 pb-10 md:px-8 md:pt-7 print:p-0">{children}</main>
      </div>
    </div>
  );
}
