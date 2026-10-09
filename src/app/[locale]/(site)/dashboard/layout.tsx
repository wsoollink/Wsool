import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { SidebarNav, TabBar } from "@/components/dashboard/DashboardNav";
import { SubmitButton } from "@/components/SubmitButton";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { signOut } from "../login/actions";

// Shell only: no user data here, so it renders instantly. Each page checks
// the session itself through requireCreator().
export default async function DashboardLayout({ children, params }: LayoutProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="app-backdrop flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col gap-6 border-e border-navy/8 bg-white/82 px-4 py-6 backdrop-blur-[14px] md:flex">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center px-3" aria-label={t("brand")}>
          <Image src={locale === "en" ? "/brand/logo-en.png" : "/brand/logo-ar.png"} alt={t("brand")} width={96} height={32} className="h-8 w-auto" priority />
        </Link>
        <nav aria-label={t("menu")} className="flex-1 overflow-y-auto">
          <SidebarNav />
        </nav>
        <form action={signOut}>
          <SubmitButton variant="secondary" className="w-full" pendingText={t("signingOut")}>
            <LogOut aria-hidden="true" size={18} />
            {t("signOut")}
          </SubmitButton>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-7 md:pb-10">{children}</main>
      </div>

      <nav
        aria-label={t("menu")}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-navy/8 bg-white/82 pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] md:hidden"
      >
        <TabBar />
      </nav>
    </div>
  );
}
