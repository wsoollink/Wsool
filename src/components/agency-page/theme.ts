import type { CSSProperties } from "react";
import type { AgencyTemplate } from "@/generated/prisma/enums";
import { ensureContrast, isDark, mix, readableOn, withAlpha } from "@/lib/color";

/**
 * Designs of the public agency page (owner, Nov 2026: "more professional than the creator page, the agency picks
 * a template"). Editorial layout, each template its own palette; the accent can be swapped for a preset.
 * Shared by the page, the dashboard previews, the OG image and the PDF.
 */
export const AGENCY_TEMPLATES = ["executive", "midnight", "graphite", "ivory"] as const satisfies readonly AgencyTemplate[];

export type AgencyTheme = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
  /** Hero band. */
  heroBg: string;
  heroInk: string;
  heroMuted: string;
  heroAccent: string;
  heroOnAccent: string;
  /** Contact band at the end. */
  bandBg: string;
  bandInk: string;
  dark: boolean;
};

type Base = Omit<AgencyTheme, "onAccent" | "dark" | "heroAccent" | "heroOnAccent">;

const BASES: Record<AgencyTemplate, Base> = {
  // Navy hero over a light page: corporate, the Wsool family look.
  executive: {
    bg: "#F5F7FA", surface: "#FFFFFF", ink: "#0B1B33", muted: "#5B6577", line: "#E3E8EF", accent: "#0060E6",
    heroBg: "#0B1B33", heroInk: "#FFFFFF", heroMuted: "#AEB9CC", bandBg: "#0B1B33", bandInk: "#FFFFFF",
  },
  // Dark page with gold: premium / talent management.
  midnight: {
    bg: "#090D16", surface: "#111827", ink: "#F3F5F9", muted: "#98A2B3", line: "#1F2937", accent: "#D4AF37",
    heroBg: "#05080F", heroInk: "#FFFFFF", heroMuted: "#A3ACBC", bandBg: "#111827", bandInk: "#FFFFFF",
  },
  // Black on white, big type, no colour: studio / creative.
  graphite: {
    bg: "#FFFFFF", surface: "#F6F6F6", ink: "#0F0F0F", muted: "#666666", line: "#E8E8E8", accent: "#0F0F0F",
    heroBg: "#FFFFFF", heroInk: "#0F0F0F", heroMuted: "#666666", bandBg: "#0F0F0F", bandInk: "#FFFFFF",
  },
  // Warm paper with deep green: boutique.
  ivory: {
    bg: "#F6F1E7", surface: "#FFFCF6", ink: "#1E2A23", muted: "#6B6F66", line: "#E5DDCB", accent: "#1F5C45",
    heroBg: "#EDE5D3", heroInk: "#1E2A23", heroMuted: "#5F655B", bandBg: "#1F5C45", bandInk: "#FFFFFF",
  },
};

/** Preset accents the agency can pick (null = the template's own). */
export const AGENCY_ACCENTS = ["#0060E6", "#7C3AED", "#DB2777", "#0F766E", "#C2410C", "#D4AF37", "#0F0F0F"] as const;

export function agencyTheme(template: AgencyTemplate, accent: string | null): AgencyTheme {
  const base = BASES[template] ?? BASES.executive;
  const dark = isDark(base.bg);
  const chosen = accent && (AGENCY_ACCENTS as readonly string[]).includes(accent) ? accent : base.accent;
  // Keep the accent readable on the page and on the hero (e.g. black accent on the dark template).
  const onPage = ensureContrast(chosen, base.surface, 4.5);
  const onHero = ensureContrast(chosen, base.heroBg, 3);
  return { ...base, accent: onPage, heroAccent: onHero, heroOnAccent: readableOn(onHero), onAccent: readableOn(onPage), dark };
}

export function agencyThemeStyle(t: AgencyTheme): CSSProperties {
  return {
    "--ag-bg": t.bg,
    "--ag-surface": t.surface,
    "--ag-ink": t.ink,
    "--ag-muted": t.muted,
    "--ag-line": t.line,
    "--ag-accent": t.accent,
    "--ag-on-accent": t.onAccent,
    "--ag-accent-soft": withAlpha(t.accent, t.dark ? 0.16 : 0.09),
    "--ag-hero-bg": t.heroBg,
    "--ag-hero-ink": t.heroInk,
    "--ag-hero-muted": t.heroMuted,
    "--ag-hero-accent": t.heroAccent,
    "--ag-hero-on-accent": t.heroOnAccent,
    "--ag-hero-line": withAlpha(t.heroInk, 0.14),
    "--ag-hero-glow": withAlpha(t.heroAccent, 0.28),
    "--ag-band-bg": t.bandBg,
    "--ag-band-ink": t.bandInk,
    "--ag-card-shade": mix(t.ink, t.bg, 0.94),
    colorScheme: t.dark ? "dark" : "light",
  } as CSSProperties;
}
