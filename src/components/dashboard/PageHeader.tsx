import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, LifeBuoy, LogOut } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { SUPPORT_EMAIL } from "@/config/site";
import { fromIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { signOut } from "@/app/[locale]/(site)/login/actions";
import { LangPill } from "./LangPill";
import { MobileMenu } from "./MobileMenu";
import { SectionIcon } from "./SectionIcon";
import { UnreadDot } from "./UnreadDot";

type Props = {
  title: ReactNode;
  /** Section key: its subtitle comes from messages DashboardHeader. */
  section?: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
};

/**
 * Page header from the dashboard design: ☰ menu (phones), title + muted
 * subtitle, and on the other side the bell (unread dot) and the language pill.
 */
export async function PageHeader({ title, section, subtitle, leading }: Props) {
  const t = await getTranslations("DashboardNav");
  const sub = await getTranslations("DashboardHeader");
  if (!subtitle && section && sub.has(section)) subtitle = sub(section);
  const lang = fromIntlLocale(await getLocale());
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <MobileMenu
          footer={
            <>
              <Suspense fallback={null}><MyPageLink label={t("viewPage")} /></Suspense>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={menuLink}>
                <LifeBuoy aria-hidden="true" size={18} />
                {t("help")}
              </a>
              <form action={signOut}>
                <SubmitButton variant="secondary" className="w-full" pendingText={t("signingOut")}>
                  <LogOut aria-hidden="true" size={18} />
                  {t("signOut")}
                </SubmitButton>
              </form>
            </>
          }
        />
        {leading}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-[19px] font-bold md:text-2xl">{title}</h1>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/dashboard/notifications"
          aria-label={t("notifications")}
          className="relative inline-flex size-11 items-center justify-center rounded-full border border-navy/8 bg-white/72 shadow-card backdrop-blur-[14px]"
        >
          <SectionIcon section="notifications" />
          <Suspense fallback={null}><UnreadDot label={t("unread")} /></Suspense>
        </Link>
        <LangPill current={lang} />
      </div>
    </header>
  );
}

const menuLink = "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-navy/5";

/** "View my page" in the phone menu (needs the session, so it streams in). */
async function MyPageLink({ label }: { label: string }) {
  const { page } = await requireCreator();
  return (
    <a href={`/${page.username}`} target="_blank" rel="noopener noreferrer" className={menuLink}>
      <ExternalLink aria-hidden="true" size={18} />
      {label}
    </a>
  );
}
