import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SELLER } from "@/config/site";

const TEXT = {
  ar: {
    links: [["/", "الرئيسية"], ["/pricing", "الأسعار"], ["/demo", "صفحة تجريبية"], ["/agencies", "للوكالات"], ["/academy", "الأكاديمية"], ["/contact", "تواصل معنا"], ["/terms", "شروط الاستخدام"], ["/privacy", "سياسة الخصوصية"], ["/refund", "سياسة الاسترجاع"]],
    nav: "روابط الموقع", made: "صُنع في السعودية", about: "ملف إعلامي احترافي لصناع المحتوى العرب، برابط واحد.",
  },
  en: {
    links: [["/", "Home"], ["/pricing", "Pricing"], ["/demo", "Demo page"], ["/agencies", "For agencies"], ["/academy", "Academy"], ["/contact", "Contact us"], ["/terms", "Terms of use"], ["/privacy", "Privacy policy"], ["/refund", "Refund policy"]],
    nav: "Site links", made: "Made in Saudi Arabia", about: "The professional media kit for content creators, in one link.",
  },
} as const;

/**
 * Footer of the creators' side pages that aren't generated from the marketing design: /contact, /terms, /privacy,
 * /refund, /academy (owner audit, Nov 2026). Same company line as the home page footer.
 */
export function SiteFooter({ lang }: { lang: "ar" | "en" }) {
  const t = TEXT[lang];
  const rights = lang === "en" ? "© 2026 All rights reserved" : "© 2026 جميع الحقوق محفوظة";
  const company = lang === "en"
    ? `${SELLER.nameEn} · CR ${SELLER.crNumber} · VAT ${SELLER.vatNumber}`
    : `${SELLER.name} · س.ت ${SELLER.crNumber} · الرقم الضريبي ${SELLER.vatNumber}`;
  return (
    <footer className="border-t border-line bg-bg-marketing">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <Link href="/" className="inline-flex min-h-11 items-center self-start"><BrandLogo lang={lang} alt={lang === "en" ? "Wsool" : "وصول"} /></Link>
          <p className="text-sm leading-7 text-muted">{t.about}</p>
        </div>
        <nav aria-label={t.nav} className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted sm:grid-cols-4">
          {t.links.map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center hover:text-blue md:min-h-8">{label}</Link>
          ))}
        </nav>
      </div>
      {/* Rights, company, made in Saudi Arabia: three centred lines on phones (owner, Nov 2026), one row on wider screens. */}
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 border-t border-line px-4 py-5 text-center text-[13px] text-muted md:flex-row md:flex-wrap md:justify-between md:gap-3 md:text-start">
        <span>{rights}</span>
        <span>{company}</span>
        <span>{t.made}</span>
      </div>
    </footer>
  );
}
