import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { ar } from "./ar";
import { en } from "./en";

export type Lang = "ar" | "en";
const DICTS = { ar, en };

type Vars = Record<string, string | number>;
/** "home.hello" → text, with {name} placeholders filled. */
function lookup(dict: unknown, key: string): string {
  const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict);
  return typeof v === "string" ? v : key;
}

/** Numbers always in Western digits 0-9, also in Arabic (CLAUDE.md section 3). */
export const intlLocale = (lang: Lang) => (lang === "ar" ? "ar-u-nu-latn" : "en");

type I18n = {
  lang: Lang;
  rtl: boolean;
  t: (key: string, vars?: Vars) => string;
  num: (n: number) => string;
  date: (iso: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  setLang: (l: Lang) => void;
};
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ lang, setLang, children }: { lang: Lang; setLang: (l: Lang) => void; children: ReactNode }) {
  const t = useCallback((key: string, vars?: Vars) => {
    let s = lookup(DICTS[lang], key);
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [lang]);
  const value = useMemo<I18n>(() => ({
    lang, rtl: lang === "ar", t, setLang,
    num: (n) => { try { return new Intl.NumberFormat(intlLocale(lang)).format(n); } catch { return String(n); } },
    date: (iso, opts = { day: "numeric", month: "long" }) => {
      try { return new Intl.DateTimeFormat(intlLocale(lang), opts).format(new Date(iso)); } catch { return new Date(iso).toISOString().slice(0, 10); }
    },
  }), [lang, t, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
