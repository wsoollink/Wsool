"use client";

import { setLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/config";
import { buttonClasses } from "./ui/Button";

type Props = { target: Locale; text: string; ariaLabel: string };

export function LanguageSwitcherButton({ target, text, ariaLabel }: Props) {
  // The URL has no language prefix, so after saving the cookie we reload the
  // same URL and the proxy serves it in the new language (lang + dir change).
  async function switchLocale(formData: FormData) {
    await setLocale(formData);
    window.location.reload();
  }

  return (
    <form action={switchLocale}>
      <input type="hidden" name="locale" value={target} />
      <button type="submit" lang={target} aria-label={ariaLabel} className={buttonClasses("secondary")}>
        {text}
      </button>
    </form>
  );
}
