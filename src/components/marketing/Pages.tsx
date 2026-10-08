"use client";

import type { Locale } from "@/i18n/config";
import { HiddenView } from "./generated/HiddenView";
import { HomeView } from "./generated/HomeView";
import { NotFoundView } from "./generated/NotFoundView";
import { PricingView } from "./generated/PricingView";
import { ServerErrorView } from "./generated/ServerErrorView";
import { HIDDEN_TEXT } from "./generated/hidden.text";
import { HOME_TEXT } from "./generated/home.text";
import { NOTFOUND_TEXT } from "./generated/notfound.text";
import { PRICING_TEXT } from "./generated/pricing.text";
import { SERVERERROR_TEXT } from "./generated/servererror.text";
import "./generated/shared.css";
import "./marketing.css";
import { useMarketing } from "./useMarketing";

type Texts = { ar: readonly string[]; en: readonly string[] };
const translator = (texts: Texts, lang: Locale) => (i: number) => texts[lang][i] ?? texts.ar[i];

/** Marketing pages: generated design views + the hook that runs them. */
export function HomePage({ lang }: { lang: Locale }) {
  return <HomeView v={useMarketing(lang, { source: "home" })} t={translator(HOME_TEXT, lang)} />;
}

export function PricingPage({ lang }: { lang: Locale }) {
  return <PricingView v={useMarketing(lang, { source: "pricing" })} t={translator(PRICING_TEXT, lang)} />;
}

/**
 * Unknown link: the design's 404 with the visited name in the text and the
 * claim box. `username` is shown in place of the design's sample name.
 */
export function NotFoundPage({ lang, username }: { lang: Locale; username: string }) {
  const sample = "wsool.link/nora.style";
  const t = translator(NOTFOUND_TEXT, lang);
  return <NotFoundView v={useMarketing(lang, { initialClaim: username })} t={(i) => t(i).replace(sample, `wsool.link/${username}`)} />;
}

export function HiddenPage({ lang }: { lang: Locale }) {
  return <HiddenView v={useMarketing(lang)} t={translator(HIDDEN_TEXT, lang)} />;
}

export function ServerErrorPage({ lang }: { lang: Locale }) {
  return <ServerErrorView v={useMarketing(lang)} t={translator(SERVERERROR_TEXT, lang)} />;
}
