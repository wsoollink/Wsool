import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRound } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangPill } from "@/components/dashboard/LangPill";

export const APPLY = "/agencies/apply";

/** Header of the agencies pages: logo, section links (landing only), creators link, theme, language, log in, apply. */
export async function AgenciesHeader({ lang, sections = true }: { lang: "ar" | "en"; sections?: boolean }) {
  const t = await getTranslations("Agencies");
  const en = lang === "en";
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg-marketing/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-4 py-3.5">
        <Link href={sections ? "/" : "/agencies"} className="flex min-h-11 shrink-0 items-center" aria-label={t("nav.home")}>
          <BrandLogo lang={lang} alt={en ? "Wsool" : "وصول"} priority className="h-8 w-auto sm:h-9" />
        </Link>
        {sections && (
          <nav aria-label={t("nav.menu")} className="hidden items-center gap-1 rounded-full border border-line bg-card/70 p-1.5 lg:flex">
            {(["features", "how", "pricing", "faq"] as const).map((k) => (
              <a key={k} href={`#${k}`} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-hover">{t(`nav.${k}`)}</a>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/" className="hidden px-2 text-sm font-medium hover:text-blue xl:inline">{t("nav.creators")}</Link>
          <span className="max-[399px]:hidden"><ThemeToggle /></span>
          <LangPill current={lang} compact />
          <Link href="/login" aria-label={t("nav.login")} className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-card md:w-auto md:px-4 md:text-sm md:font-bold">
            <UserRound aria-hidden="true" size={18} className="md:hidden" />
            <span className="hidden md:inline">{t("nav.login")}</span>
          </Link>
          {sections && (
            <Link href={APPLY} className="inline-flex min-h-11 items-center rounded-full bg-[#021941] px-4 text-sm font-bold whitespace-nowrap text-white sm:px-5 dark:bg-[#7DD3FC] dark:text-[#021941]">
              <span className="sm:hidden">{t("ctaShort")}</span>
              <span className="hidden sm:inline">{t("ctaTrial")}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
