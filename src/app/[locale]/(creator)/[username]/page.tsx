import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HiddenPage } from "@/components/marketing/Pages";
import { toIntlLocale } from "@/i18n/config";
import { loadCreatorPage } from "@/lib/creator-page";
import { siteOrigin } from "@/lib/site-url";
import { CreatorProfile } from "./CreatorProfile";

export async function generateMetadata({ params }: PageProps<"/[locale]/[username]">): Promise<Metadata> {
  const { locale, username } = await params;
  const { data, lang } = await loadCreatorPage(locale, username);
  if (data?.status !== "published") return { robots: { index: false } };
  const tr = data.translations.find((x) => x.lang === lang) ?? data.translations[0];
  const name = tr?.fullName || data.username;
  const title = tr?.specialty ? `${name} · ${tr.specialty}` : name;
  // The image is CDN-cached for a day: a fingerprint of what it shows gives a new URL whenever that
  // changes (followers, name, photo, colors), so link previews never show stale numbers.
  const shown = [lang, name, tr?.specialty, data.photoUrl, data.photoShape, data.showNumbers, data.template, data.accent, JSON.stringify(data.customColors),
    data.accounts.map((a) => `${a.platform}:${a.followers}:${a.verified ? 1 : 0}`).join(",")];
  const v = createHash("sha1").update(shown.join("|")).digest("hex").slice(0, 10);
  const image = { url: `/${data.username}/og?lang=${lang}&v=${v}`, width: 1200, height: 630, alt: name };
  return {
    metadataBase: new URL(siteOrigin()),
    title,
    description: tr?.bio || undefined,
    alternates: { canonical: `/${data.username}` },
    openGraph: { type: "profile", title, description: tr?.bio || undefined, url: `/${data.username}`, siteName: "Wsool", images: [image] },
    twitter: { card: "summary_large_image", title, description: tr?.bio || undefined, images: [image] },
  };
}

export default async function CreatorPage({ params }: PageProps<"/[locale]/[username]">) {
  const { locale, username } = await params;
  const { raw, username: name, data, lang, movedTo } = await loadCreatorPage(locale, username);
  // Temporary (307): the old name is released after 30 days.
  if (!data && movedTo) redirect(`/${movedTo}`);
  if (!data) notFound();
  // Usernames are case-insensitive: send /Ali to the canonical /ali.
  if (raw !== name) permanentRedirect(`/${name}`);
  setRequestLocale(toIntlLocale(lang));

  // Unpublished, deleted or suspended: the design's "page hidden" state.
  if (data.status === "hidden") return <HiddenPage lang={lang} />;

  return <CreatorProfile page={data} lang={lang} />;
}
