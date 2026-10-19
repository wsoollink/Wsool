import { cache, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, LifeBuoy, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeMenuItem, ThemeToggle } from "@/components/ThemeToggle";
import { SidebarNav } from "@/components/dashboard/DashboardNav";
import { LangPill } from "@/components/dashboard/LangPill";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { SectionIcon } from "@/components/dashboard/SectionIcon";
import { SectionSearch } from "@/components/dashboard/SectionSearch";
import { UnreadDot } from "@/components/dashboard/UnreadDot";
import { iconButton, navRow, topBar } from "@/components/ui/styles";
import { SUPPORT_EMAIL } from "@/config/site";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import type { Lang } from "@/generated/prisma/client";
import { initials } from "@/lib/initials";
import { signOut } from "../login/actions";

// The card is drawn twice (sidebar + phone menu): one query per request.
const primaryName = cache((pageId: string, lang: Lang) =>
  db.pageTranslation.findFirst({ where: { pageId, lang }, select: { fullName: true } }));

/** Who is signed in: photo / initial, name and page link (top of the sidebar and the phone menu). */
async function CreatorCard() {
  const { page } = await requireCreator();
  const tr = await primaryName(page.id, page.primaryLang);
  const name = tr?.fullName || page.username;
  return (
    <a href={`/${page.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-2.5 shadow-card transition-colors hover:bg-hover">
      {page.photoUrl ? (
        <Image src={page.photoUrl} alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="brand-gradient inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white uppercase">{initials(name)}</span>
      )}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[13px] font-bold">{name}</span>
        <span dir="ltr" className="truncate text-[11.5px] text-muted rtl:text-end">wsool.link/{page.username}</span>
      </span>
      <ExternalLink aria-hidden="true" size={14} className="shrink-0 text-faint" />
    </a>
  );
}

// Shell: the sidebar and top bar render instantly; anything that needs the
// session streams in (Suspense). Each page checks the session itself through requireCreator().
export default async function DashboardLayout({ children, params }: LayoutProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");
  const logo = locale === "en" ? "en" : "ar";

  const footer = (
    <>
      <ThemeMenuItem className={`${navRow} w-full md:hidden`} />
      <a href={`mailto:${SUPPORT_EMAIL}`} className={navRow}>
        <LifeBuoy aria-hidden="true" size={17} />
        {t("help")}
      </a>
      <form action={signOut}>
        <button type="submit" className={`${navRow} w-full`}>
          <LogOut aria-hidden="true" size={17} />
          {t("signOut")}
        </button>
      </form>
    </>
  );

  return (
    <div className="app-backdrop flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-3 border-e border-line px-3 pt-4 pb-3 md:flex">
        <Link href="/dashboard" className="inline-flex min-h-10 items-center px-2.5" aria-label={t("brand")}>
          <BrandLogo lang={logo} alt={t("brand")} className="h-7 w-auto" priority />
        </Link>
        <Suspense fallback={<div className="h-[54px] rounded-xl border border-line bg-card" />}><CreatorCard /></Suspense>
        <nav aria-label={t("menu")} className="-mx-1 flex-1 overflow-y-auto px-1 pt-1">
          <SidebarNav />
        </nav>
        <div className="flex flex-col gap-0.5 border-t border-line pt-2">{footer}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={topBar}>
          <MobileMenu card={<Suspense fallback={null}><CreatorCard /></Suspense>} footer={footer} />
          <Link href="/dashboard" className="inline-flex min-h-11 items-center md:hidden" aria-label={t("brand")}>
            <BrandLogo lang={logo} alt={t("brand")} className="h-[26px] w-auto" />
          </Link>
          <div className="hidden flex-1 md:block"><SectionSearch /></div>
          <span className="flex-1 md:hidden" />
          <ThemeToggle bare className="hidden md:inline-flex" />
          <Link href="/dashboard/notifications" aria-label={t("notifications")} className={iconButton}>
            <SectionIcon section="notifications" size={18} />
            <Suspense fallback={null}><UnreadDot label={t("unread")} /></Suspense>
          </Link>
          <LangPill current={locale} />
        </header>
        <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 pt-5 pb-10 md:px-8 md:pt-7">{children}</main>
      </div>
    </div>
  );
}
