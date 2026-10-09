import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { fromIntlLocale } from "@/i18n/config";
import { LangPill } from "./LangPill";
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
 * Page header from the dashboard design: title + muted subtitle, and on the
 * other side the bell (unread dot) and the language pill.
 */
export async function PageHeader({ title, section, subtitle, leading }: Props) {
  const t = await getTranslations("DashboardNav");
  const sub = await getTranslations("DashboardHeader");
  if (!subtitle && section && sub.has(section)) subtitle = sub(section);
  const lang = fromIntlLocale(await getLocale());
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
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
