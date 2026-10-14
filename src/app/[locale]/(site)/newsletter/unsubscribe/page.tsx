import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { verifyLink } from "@/lib/newsletter";
import { LinkAction } from "../LinkAction";
import { Result } from "../Result";

export const metadata: Metadata = { robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Run({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const id = String(sp.id ?? ""), token = String(sp.t ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id) || !verifyLink("unsubscribe", id, token)) return <Result kind="invalid" />;
  // Nothing changes on page load (mail scanners open links): the person presses the button.
  const t = await getTranslations("Newsletter");
  const texts = {
    title: t("unsubscribePrompt.title"), body: t("unsubscribePrompt.body"), cta: t("unsubscribePrompt.cta"), home: t("home"),
    confirmed: { title: t("confirmed.title"), body: t("confirmed.body") },
    unsubscribed: { title: t("unsubscribed.title"), body: t("unsubscribed.body") },
    invalid: { title: t("invalid.title"), body: t("invalid.body") },
  };
  return <LinkAction kind="unsubscribe" id={id} token={token} texts={texts} />;
}

/** Link from the newsletter email (unsubscribe). */
export default async function Page({ params, searchParams }: PageProps<"/[locale]/newsletter/unsubscribe">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <Suspense fallback={null}><Run searchParams={searchParams} /></Suspense>;
}
