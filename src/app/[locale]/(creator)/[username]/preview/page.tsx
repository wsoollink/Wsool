import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getDirection, isLocale, toIntlLocale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolvePageLang } from "@/lib/page-language";
import { getPreviewPage } from "@/lib/public-page";
import { CreatorProfile } from "../CreatorProfile";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * /<username>/preview?lang=: the page as it would look published, for its
 * owner only (dashboard Edit page shows it in a frame). Fresh data, no visit
 * counting, works while the page is hidden. Anyone else gets 404.
 */
async function Preview({ params, searchParams }: { params: PageProps<"/[locale]/[username]/preview">["params"]; searchParams: PageProps<"/[locale]/[username]/preview">["searchParams"] }) {
  const { username } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  // Ownership from the verified session: the page must be this user's.
  const own = await db.page.findFirst({ where: { username: decodeURIComponent(username).toLowerCase(), userId: user.id }, select: { id: true } });
  if (!own) notFound();
  const data = await getPreviewPage(own.id);
  if (!data) notFound();
  const asked = (await searchParams).lang;
  const lang = resolvePageLang(isLocale(asked) ? asked : data.primaryLang, data.primaryLang, data.enEnabled);
  setRequestLocale(toIntlLocale(lang));
  return (
    <div lang={lang} dir={getDirection(lang)} className="flex flex-1 flex-col">
      <CreatorProfile page={data} lang={lang} preview />
    </div>
  );
}

export default function PreviewPage(props: PageProps<"/[locale]/[username]/preview">) {
  return (
    <Suspense fallback={null}>
      <Preview params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
