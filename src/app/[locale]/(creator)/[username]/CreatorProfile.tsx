import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import type { PublishedPage } from "@/lib/public-page";

// Temporary profile view; the full sections and templates come next.
export async function CreatorProfile({ page, lang }: { page: PublishedPage; lang: Locale }) {
  const t = await getTranslations("CreatorPage");
  const tr = page.translations.find((x) => x.lang === lang) ?? page.translations[0];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-10">
      <h1 className="text-3xl font-bold">{tr?.fullName || page.username}</h1>
      {tr?.specialty && <p className="text-blue">{tr.specialty}</p>}
      {tr?.bio && <p className="text-muted">{tr.bio}</p>}
      {page.showBranding && <p className="mt-10 text-center text-sm text-muted">{t("madeWith")}</p>}
    </main>
  );
}
