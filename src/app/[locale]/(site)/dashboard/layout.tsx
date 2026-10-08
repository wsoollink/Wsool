import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { SidebarNav, TabBar } from "@/components/dashboard/DashboardNav";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
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
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-e border-line bg-card p-4 md:flex">
        <Link href="/dashboard" className="brand-gradient bg-clip-text px-3 pt-2 text-2xl font-bold text-transparent">
          {t("brand")}
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
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur">
          <Link href="/dashboard" className="brand-gradient bg-clip-text text-xl font-bold text-transparent md:invisible">
            {t("brand")}
          </Link>
          {/* TODO(notifications): show an unread dot once notifications exist. */}
          <Link
            href="/dashboard/notifications"
            aria-label={t("notifications")}
            className="relative inline-flex size-11 items-center justify-center rounded-full text-navy hover:bg-navy/5"
          >
            <SectionIcon section="notifications" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 md:pb-10">{children}</main>
      </div>

      <nav
        aria-label={t("menu")}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <TabBar />
      </nav>
    </div>
  );
}
