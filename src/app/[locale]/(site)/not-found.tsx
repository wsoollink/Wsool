import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Link href="/" className="underline min-h-11 inline-flex items-center">
        {t("back")}
      </Link>
    </main>
  );
}
