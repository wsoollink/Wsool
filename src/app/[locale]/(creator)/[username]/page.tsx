import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toIntlLocale } from "@/i18n/config";
import { loadCreatorPage } from "@/lib/creator-page";
import { CreatorProfile } from "./CreatorProfile";

export async function generateMetadata({ params }: PageProps<"/[locale]/[username]">): Promise<Metadata> {
  const { locale, username } = await params;
  const { data, lang } = await loadCreatorPage(locale, username);
  if (data?.status !== "published") return { robots: { index: false } };
  const tr = data.translations.find((x) => x.lang === lang) ?? data.translations[0];
  const name = tr?.fullName || data.username;
  return {
    title: tr?.specialty ? `${name} · ${tr.specialty}` : name,
    description: tr?.bio || undefined,
    alternates: { canonical: `/${data.username}` },
  };
}

export default async function CreatorPage({ params }: PageProps<"/[locale]/[username]">) {
  const { locale, username } = await params;
  const { raw, username: name, data, lang } = await loadCreatorPage(locale, username);
  if (!data) notFound();
  // Usernames are case-insensitive: send /Ali to the canonical /ali.
  if (raw !== name) permanentRedirect(`/${name}`);
  setRequestLocale(toIntlLocale(lang));

  if (data.status === "hidden") {
    const t = await getTranslations("CreatorPage");
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">{t("hiddenTitle")}</h1>
        <p className="text-muted">{t("hiddenBody")}</p>
      </main>
    );
  }

  return <CreatorProfile page={data} lang={lang} />;
}
