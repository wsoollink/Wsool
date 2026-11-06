import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";

/** Top bar of the Academy pages: logo, "Academy" home link, theme, start free. */
export async function AcademyHeader({ lang }: { lang: "ar" | "en" }) {
  const t = await getTranslations("Academy");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href="/" className="flex min-h-11 shrink-0 items-center" aria-label={t("home")}>
            <BrandLogo lang={lang} alt={lang === "en" ? "Wsool" : "وصول"} priority />
          </Link>
          <Link href="/academy" className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-sm font-bold text-navy hover:bg-navy/5 sm:px-3">
            <GraduationCap aria-hidden="true" size={18} className="text-blue" /> {t("name")}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {/* Phones: no room next to the logo and the Academy link (the page's own call to action sits below). */}
          <span className="hidden sm:contents"><Link href="/login" className={buttonClasses("primary")}>{t("start")}</Link></span>
        </div>
      </div>
    </header>
  );
}
