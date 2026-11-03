import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { AgenciesHeader } from "../Header";
import { ApplyForm } from "./ApplyForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/agencies/apply">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "AgencyApply" });
  return { title: t("metaTitle") };
}

/** "Join as an agency" (owner, Nov 2026): name, agency, the email to open the account with, phone. */
export default async function AgencyApplyPage({ params }: PageProps<"/[locale]/agencies/apply">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("AgencyApply");
  const lang = locale === "en" ? "en" : "ar";
  return (
    <div className="ag-grid flex flex-1 flex-col bg-bg-marketing">
      <AgenciesHeader lang={lang} sections={false} />
      <main className="mx-auto grid w-full max-w-[1080px] flex-1 grid-cols-1 gap-8 px-4 py-10 md:py-16 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold text-blue">{t("eyebrow")}</p>
          <h1 className="text-3xl leading-tight font-black md:text-5xl md:leading-tight">{t("title")}</h1>
          <p className="text-[15px] leading-7 text-muted">{t("body")}</p>
          <ul className="flex flex-col gap-2.5">
            {(t.raw("points") as string[]).map((p) => (
              <li key={p} className="flex items-start gap-2 text-[15px]"><CheckCircle2 aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-good" />{p}</li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-[24px] border border-line bg-card p-5 shadow-card md:p-7">
          <ApplyForm lang={lang} />
        </div>
      </main>
    </div>
  );
}
