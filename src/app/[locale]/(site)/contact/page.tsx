import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Mail, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SELLER, SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, supportWhatsappUrl } from "@/config/site";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { ContactForm } from "./ContactForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Contact" });
  return { title: `${t("metaTitle")} · ${locale === "en" ? "Wsool" : "وصول"}`, description: t("lead") };
}

/** "Contact us" (owner, Oct 2026): form to support@, company details and a WhatsApp card. Linked from the marketing footer. */
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Contact");
  const en = locale === "en";

  const info = [
    { icon: Building2, label: t("companyName"), value: en ? SELLER.nameEn : SELLER.name },
    { icon: MapPin, label: t("address"), value: en ? SELLER.addressEn : SELLER.address },
    { icon: Mail, label: t("emailLabel"), value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, ltr: true },
  ];

  return (
    <div className="flex flex-1 flex-col bg-bg-marketing">
      <header className="border-b border-line bg-card/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-h-11 items-center" aria-label={t("home")}>
            <BrandLogo lang={en ? "en" : "ar"} alt={en ? "Wsool" : "وصول"} priority />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className={buttonClasses("primary")}>{t("start")}</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold md:text-3xl">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("lead")}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.5fr_1fr]">
          <Card className="p-5 md:p-6">
            <h2 className="mb-4 text-lg font-bold">{t("formTitle")}</h2>
            <ContactForm lang={en ? "en" : "ar"} />
          </Card>

          <aside className="flex flex-col gap-5">
            <Card className="px-4 py-5 md:p-6">
              <h2 className="mb-2 text-lg font-bold">{t("company")}</h2>
              <dl>
                {info.map(({ icon: Icon, label, value, href, ltr }) => (
                  <div key={label} className="flex gap-2.5 border-b border-line-soft py-3.5 last:border-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-bg text-blue"><Icon aria-hidden="true" size={17} /></span>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="text-[13px] leading-relaxed font-bold" dir={ltr ? "ltr" : undefined}>
                        {href ? <a href={href} className="hover:text-blue">{value}</a> : value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </Card>

            <div className="rounded-[14px] bg-gradient-to-br from-[#021941] to-[#0A3A8C] p-6 text-center text-white">
              <p className="text-lg font-bold">{t("waTitle")}</p>
              <p className="mt-1 mb-4 text-sm opacity-85">{t("waBody")}</p>
              <a href={supportWhatsappUrl(t("waText"))} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#12805C] px-5 text-sm font-semibold text-white hover:bg-[#0f6e4f]">
                <PlatformIcon platform="whatsapp" size={18} />
                {t("waButton")}
              </a>
              <p className="mt-3 text-sm opacity-85" dir="ltr">{SUPPORT_WHATSAPP_DISPLAY}</p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">© wsool.link</footer>
    </div>
  );
}
