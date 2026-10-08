import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { ContactForm } from "./ContactForm";

async function Editor() {
  const { user, page } = await requireCreator();
  return <ContactForm initial={{ whatsapp: page.whatsapp ?? "", email: page.contactEmail ?? "" }} accountEmail={user.email} />;
}

export default async function ContactPage({ params }: PageProps<"/[locale]/dashboard/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("contact")}</h1>
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
