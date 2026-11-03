import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SELLER } from "@/config/site";

const TEXT = {
  ar: {
    links: [["/", "الرئيسية"], ["/pricing", "الأسعار"], ["/demo", "صفحة تجريبية"], ["/agencies", "للوكالات"], ["/contact", "تواصل معنا"], ["/terms", "شروط الاستخدام"], ["/privacy", "سياسة الخصوصية"], ["/refund", "سياسة الاسترجاع"]],
    nav: "روابط الموقع", made: "صُنع في السعودية",
  },
  en: {
    links: [["/", "Home"], ["/pricing", "Pricing"], ["/demo", "Demo page"], ["/agencies", "For agencies"], ["/contact", "Contact us"], ["/terms", "Terms of use"], ["/privacy", "Privacy policy"], ["/refund", "Refund policy"]],
    nav: "Site links", made: "Made in Saudi Arabia",
  },
} as const;

/**
 * Footer of the creators' side pages that aren't generated from the marketing design: /contact, /terms, /privacy,
 * /refund (owner audit, Nov 2026). Same company line as the home page footer.
 */
export function SiteFooter({ lang }: { lang: "ar" | "en" }) {
  const t = TEXT[lang];
  const company = lang === "en"
    ? `© 2026 ${SELLER.nameEn} · CR ${SELLER.crNumber} · VAT ${SELLER.vatNumber}`
    : `© 2026 ${SELLER.name} · س.ت ${SELLER.crNumber} · الرقم الضريبي ${SELLER.vatNumber}`;
  return (
    <footer className="border-t border-line bg-bg-marketing">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between">
        <Link href="/" className="inline-flex min-h-11 items-center self-start"><BrandLogo lang={lang} alt={lang === "en" ? "Wsool" : "وصول"} /></Link>
        <nav aria-label={t.nav} className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted sm:grid-cols-4">
          {t.links.map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center hover:text-blue md:min-h-8">{label}</Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 border-t border-line px-4 py-5 text-[13px] text-muted">
        <span>{company}</span>
        <span>{t.made}</span>
      </div>
    </footer>
  );
}
