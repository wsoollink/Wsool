import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Building2, Mail, MapPin } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Card } from "@/components/ui/Card";
import { SELLER, SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, supportWhatsappUrl } from "@/config/site";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { ContactForm } from "../../contact/ContactForm";
import { AgenciesFooter, AgenciesHeader, APPLY } from "../Header";
import { shareMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "AgencyContact" });
  const m = await getTranslations({ locale: toIntlLocale(locale), namespace: "Metadata" });
  return shareMeta(locale, { title: t("title"), description: m("agencyContactDesc"), path: "/agencies/contact", canonical: true });
}

/** Contact page for agencies and brands (owner, Nov 2026): the same form (topic "partnership"), the join form, company details, WhatsApp. */
export default async function AgencyContactPage({ params }: PageProps<"/[locale]/agencies/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("AgencyContact");
  const tc = await getTranslations("Contact");
  const lang = locale === "en" ? "en" : "ar";
  const en = lang === "en";
  const Arrow = en ? ArrowRight : ArrowLeft;
  const info = [
    { icon: Building2, label: tc("companyName"), value: en ? SELLER.nameEn : SELLER.name },
    { icon: MapPin, label: tc("address"), value: en ? SELLER.addressEn : SELLER.address },
    { icon: Mail, label: tc("emailLabel"), value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, ltr: true },
  ];

  return (
    <div className="ag-grid flex flex-1 flex-col bg-bg-marketing">
      <AgenciesHeader lang={lang} sections={false} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold md:text-3xl">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("lead")}</p>
        </div>

        <Link href={APPLY} className="mb-5 flex items-center justify-between gap-3 rounded-[14px] border border-blue/25 bg-blue/5 px-5 py-4 hover:bg-blue/10">
          <span>
            <span className="block font-bold text-blue">{t("applyTitle")}</span>
            <span className="text-sm text-muted">{t("applyBody")}</span>
          </span>
          <Arrow aria-hidden="true" size={20} className="shrink-0 text-blue" />
        </Link>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.5fr_1fr]">
          <Card className="p-5 md:p-6">
            <h2 className="mb-4 text-lg font-bold">{t("formTitle")}</h2>
            <ContactForm lang={lang} topic="partnership" />
          </Card>

          <aside className="flex flex-col gap-5">
            <Card className="px-4 py-5 md:p-6">
              <h2 className="mb-2 text-lg font-bold">{tc("company")}</h2>
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
              <p className="text-lg font-bold">{tc("waTitle")}</p>
              <p className="mt-1 mb-4 text-sm opacity-85">{t("waBody")}</p>
              <a href={supportWhatsappUrl(t("waText"))} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#12805C] px-5 text-sm font-semibold text-white hover:bg-[#0f6e4f]">
                <PlatformIcon platform="whatsapp" size={18} />
                {tc("waButton")}
              </a>
              <p className="mt-3 text-sm opacity-85" dir="ltr">{SUPPORT_WHATSAPP_DISPLAY}</p>
            </div>
          </aside>
        </div>
      </main>
      <AgenciesFooter lang={lang} />
    </div>
  );
}
