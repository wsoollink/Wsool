import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { ContactForm } from "./ContactForm";
import { PageHeader } from "@/components/dashboard/PageHeader";

async function Editor() {
  const { user, page } = await requireCreator();
  // Taps this month (UTC), counted from the page's own analytics.
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const clicks = await db.contactClick.groupBy({ by: ["kind"], where: { pageId: page.id, day: { gte: since }, kind: { in: ["whatsapp", "email"] } }, _count: true });
  const taps = (k: string) => clicks.find((c) => c.kind === k)?._count ?? 0;
  return (
    <ContactForm
      initial={{ whatsapp: page.whatsapp ?? "", email: page.contactEmail ?? "", whatsappVisible: page.whatsappVisible, emailVisible: page.emailVisible }}
      accountEmail={user.email} taps={{ whatsapp: taps("whatsapp"), email: taps("email") }}
    />
  );
}

export default async function ContactPage({ params }: PageProps<"/[locale]/dashboard/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("DashboardNav");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("contact")} section="contact" />
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </div>
  );
}
