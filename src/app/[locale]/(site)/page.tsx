import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isLocale, toIntlLocale } from "@/i18n/config";

// Placeholder home page (the marketing site is built in Phase 6).
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  const t = await getTranslations("Home");
  const format = await getFormatter();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="brand-gradient bg-clip-text text-4xl font-bold text-transparent">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </div>

      <Card className="text-center">
        <p className="text-sm text-muted">{t("followers")}</p>
        <p className="mt-1 font-numbers text-4xl tabular-nums">{format.number(1250400)}</p>
        <ul className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold">
          <li className="rounded-full bg-good/10 px-3 py-1 text-good">{t("good")}</li>
          <li className="rounded-full bg-warn/10 px-3 py-1 text-warn">{t("warn")}</li>
          <li className="rounded-full bg-bad/10 px-3 py-1 text-bad">{t("bad")}</li>
        </ul>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button>{t("start")}</Button>
        <LanguageSwitcher locale={locale} />
      </div>
    </main>
  );
}
