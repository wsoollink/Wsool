import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRound } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangPill } from "@/components/dashboard/LangPill";
import { SELLER } from "@/config/site";

export const APPLY = "/agencies/apply";

/** Header of the agencies pages: logo, section links (landing only), creators link, theme, language, log in, apply. */
export async function AgenciesHeader({ lang, sections = true }: { lang: "ar" | "en"; sections?: boolean }) {
  const t = await getTranslations("Agencies");
  const en = lang === "en";
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg-marketing/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-4 py-3.5">
        <Link href="/agencies" className="flex min-h-11 shrink-0 items-center" aria-label={t("nav.agenciesHome")}>
          <BrandLogo lang={lang} alt={en ? "Wsool" : "وصول"} priority className="h-8 w-auto sm:h-9" />
        </Link>
        {sections && (
          <nav aria-label={t("nav.menu")} className="hidden items-center gap-1 rounded-full border border-line bg-card/70 p-1.5 lg:flex">
            {(["features", "how", "pricing", "faq"] as const).map((k) => (
              <a key={k} href={`#${k}`} className="rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-hover">{t(`nav.${k}`)}</a>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/" className="hidden px-2 text-sm font-medium whitespace-nowrap hover:text-blue xl:inline">{t("nav.creators")}</Link>
          <span className="max-[399px]:hidden"><ThemeToggle /></span>
          <LangPill current={lang} compact />
          <Link href="/login" aria-label={t("nav.login")} className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-card md:w-auto md:px-4 md:text-sm md:font-bold md:whitespace-nowrap">
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

/** Footer of the agencies pages: tagline, the agencies' own contact + legal pages, company line (like the home page). */
export async function AgenciesFooter({ lang }: { lang: "ar" | "en" }) {
  const t = await getTranslations("Agencies");
  const en = lang === "en";
  const company = en
    ? `© ${YEAR} ${SELLER.nameEn} · CR ${SELLER.crNumber} · VAT ${SELLER.vatNumber}`
    : `© ${YEAR} ${SELLER.name} · س.ت ${SELLER.crNumber} · الرقم الضريبي ${SELLER.vatNumber}`;
  return (
    <footer className="border-t border-line bg-bg-marketing">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <BrandLogo lang={lang} alt={en ? "Wsool" : "وصول"} />
          {/* One line (customers, Nov 2026); shrinks with the width on small phones. */}
          <p className="mt-3 text-[clamp(11px,3.2vw,14px)] leading-7 whitespace-nowrap text-muted">{t("footerTag")}</p>
        </div>
        <nav aria-label={t("footerNav")} className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm text-muted">
          {(["contact", "terms", "privacy", "refund"] as const).map((k) => (
            <Link key={k} href={`/agencies/${k}`} className="inline-flex min-h-11 items-center hover:text-blue md:min-h-6">{t(`footerLinks.${k}`)}</Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3 border-t border-line px-4 py-6 text-[13px] text-muted">
        <span>{company}</span>
        <span>{t("madeIn")}</span>
      </div>
    </footer>
  );
}

const YEAR = 2026;
