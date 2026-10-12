"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

const KEY = "wsool-theme";
type Theme = "light" | "dark";

/**
 * Runs in <head> before the page paints (site root layout), so a dark page
 * never flashes light: the saved choice, else the device setting.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

function current(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function apply(theme: Theme, save: boolean) {
  document.documentElement.dataset.theme = theme;
  if (save) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }
  window.dispatchEvent(new Event("wsool-theme"));
}

/** The page's theme, kept in sync across every toggle on the page and with the device setting. */
function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const sync = () => setTheme(current());
    sync();
    // Without a saved choice, follow the device when it switches.
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      let saved = null;
      try {
        saved = localStorage.getItem(KEY);
      } catch {}
      if (!saved) apply(media.matches ? "dark" : "light", false);
    };
    window.addEventListener("wsool-theme", sync);
    media.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener("wsool-theme", sync);
      media.removeEventListener("change", onSystem);
    };
  }, []);
  return [theme, (t) => apply(t, true)];
}

/** Round sun/moon button (headers). */
export function ThemeToggle({ className = "inline-flex" }: { className?: string }) {
  const t = useTranslations("Theme");
  const [theme, set] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button" onClick={() => set(dark ? "light" : "dark")} aria-label={dark ? t("toLight") : t("toDark")} title={dark ? t("toLight") : t("toDark")}
      className={`size-11 shrink-0 items-center justify-center rounded-full border border-navy/8 bg-card/72 shadow-card backdrop-blur-[14px] ${className}`}
    >
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </button>
  );
}

/** Menu row version (phone menu): icon + "Dark mode" / "Light mode". */
export function ThemeMenuItem({ className = "" }: { className?: string }) {
  const t = useTranslations("Theme");
  const [theme, set] = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" onClick={() => set(dark ? "light" : "dark")} className={className}>
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
      {dark ? t("toLight") : t("toDark")}
    </button>
  );
}
