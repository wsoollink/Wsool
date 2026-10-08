import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale, toIntlLocale } from "@/i18n/config";
import { unsubscribe, verifyLink } from "@/lib/newsletter";
import { Result } from "../Result";

export const metadata: Metadata = { robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

async function Run({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const id = String(sp.id ?? ""), token = String(sp.t ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id) || !verifyLink("unsubscribe", id, token)) return <Result kind="invalid" />;
  return <Result kind={(await unsubscribe(id)) ? "unsubscribed" : "invalid"} />;
}

/** Link from the newsletter email (unsubscribe). */
export default async function Page({ params, searchParams }: PageProps<"/[locale]/newsletter/unsubscribe">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(toIntlLocale(locale));
  return <Suspense fallback={null}><Run searchParams={searchParams} /></Suspense>;
}
