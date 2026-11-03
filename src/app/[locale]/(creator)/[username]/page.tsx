import { createHash } from "node:crypto";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HiddenPage } from "@/components/marketing/Pages";
import { toIntlLocale } from "@/i18n/config";
import { loadCreatorPage, withPrivateView } from "@/lib/creator-page";
import type { PublishedPage } from "@/lib/public-page";
import type { Locale } from "@/i18n/config";
import { siteOrigin } from "@/lib/site-url";
import { CreatorProfile } from "./CreatorProfile";
import { AgencyProfile } from "@/components/agency-page/AgencyProfile";
import type { PublicAgency } from "@/lib/agency-page";

function agencyMetadata(agency: PublicAgency, lang: Locale): Metadata {
  const title = agency.tagline ? `${agency.name} · ${agency.tagline}` : agency.name;
  const description = agency.bio.slice(0, 200) || agency.tagline || undefined;
  const shown = [lang, agency.name, agency.tagline, agency.logoUrl, agency.template, agency.accent, agency.stats.creators, agency.stats.followers,
    agency.creators.slice(0, 6).map((c) => c.photoUrl).join(",")];
  const v = createHash("sha1").update(shown.join("|")).digest("hex").slice(0, 10);
  const image = { url: `/${agency.slug}/og?lang=${lang}&v=${v}`, width: 1200, height: 630, alt: agency.name };
  return {
    metadataBase: new URL(siteOrigin()),
    title,
    description,
    alternates: { canonical: `/${agency.slug}` },
    openGraph: { type: "website", title, description, url: `/${agency.slug}`, siteName: "Wsool", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[username]">): Promise<Metadata> {
  const { locale, username } = await params;
  const { data, lang, agency } = await loadCreatorPage(locale, username);
  if (agency) return agencyMetadata(agency, lang);
  if (data?.status !== "published") return { robots: { index: false } };
  // Whole page private: no bio in previews, and search engines leave it out.
  const locked = data.privacy.locked;
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
    ...(locked && { robots: { index: false } }),
    alternates: { canonical: `/${data.username}` },
    openGraph: { type: "profile", title, description: tr?.bio || undefined, url: `/${data.username}`, siteName: "Wsool", images: [image] },
    twitter: { card: "summary_large_image", title, description: tr?.bio || undefined, images: [image] },
  };
}

export default async function CreatorPage({ params }: PageProps<"/[locale]/[username]">) {
  const { locale, username } = await params;
  const { raw, username: name, data, lang, movedTo, agency } = await loadCreatorPage(locale, username);
  // Temporary (307): the old name is released after 30 days.
  if (!data && movedTo) redirect(`/${movedTo}`);
  if (agency) {
    if (raw !== name) permanentRedirect(`/${name}`);
    setRequestLocale(toIntlLocale(lang));
    return <AgencyProfile agency={agency} lang={lang} />;
  }
  if (!data) notFound();
  // Usernames are case-insensitive: send /Ali to the canonical /ali.
  if (raw !== name) permanentRedirect(`/${name}`);
  setRequestLocale(toIntlLocale(lang));

  // Unpublished, deleted or suspended: the design's "page hidden" state.
  if (data.status === "hidden") return <HiddenPage lang={lang} />;

  // Pages with a private view: the visitor's unlock cookie decides which variant renders.
  if (data.privacy.canUnlock) {
    return (
      <Suspense fallback={null}>
        <Unlockable page={data} lang={lang} />
      </Suspense>
    );
  }
  return <CreatorProfile page={data} lang={lang} />;
}

async function Unlockable({ page, lang }: { page: PublishedPage; lang: Locale }) {
  const data = await withPrivateView(page);
  return <CreatorProfile page={data?.status === "published" ? data : page} lang={lang} />;
}
