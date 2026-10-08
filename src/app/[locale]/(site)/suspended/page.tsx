import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { signOut } from "../login/actions";

/** Shown to creators whose account staff suspended. */
export default async function SuspendedPage({ params }: PageProps<"/[locale]/suspended">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Suspended");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Card className="flex flex-col items-start gap-4 p-6">
        <ShieldAlert aria-hidden="true" size={32} className="text-bad" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("body")}</p>
        <a href="mailto:support@wsool.link" className="text-sm font-medium text-blue underline">support@wsool.link</a>
        <form action={signOut}>
          <SubmitButton variant="secondary" pendingText={t("signingOut")}>{t("signOut")}</SubmitButton>
        </form>
      </Card>
    </main>
  );
}
