import type { CSSProperties } from "react";
import type { Template } from "@/generated/prisma/enums";
import { contrast, ensureContrast, isDark, isHexColor, mix, readableOn, withAlpha } from "@/lib/color";
import { swatchFor } from "@/lib/validation/appearance";

/**
 * Colors a creator page template provides, as CSS variables. Values come from
 * the owner's approved design ("وصول — صفحة الصانع"): a soft grid and glows on
 * the background, frosted cards, solid boxes (views, contact, logos) and big
 * numbers in a gradient from the text color to `gradEnd`.
 */
export type PageTheme = {
  bg: string;
  /** Glows + 32px grid layered over `bg`. */
  bgImage?: string;
  /** Frosted card fill (may be translucent). */
  surface: string;
  /** Opaque box fill (views box, contact cards, logo tiles, desktop sidebar). */
  solid: string;
  /** Pills and icon tiles inside cards. */
  soft: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  /** Text on accent-colored fills. */
  onAccent: string;
  /** End color of the big-number gradient. */
  gradEnd: string;
  /** Language / share buttons over the photo. */
  pill: string;
  /** Translucent cards over a dark background. */
  glass?: boolean;
  dark: boolean;
};

type Base = Omit<PageTheme, "onAccent" | "dark" | "bgImage"> & { glow: string; grid: string };

const LIGHT_PILL = "rgba(255, 255, 255, 0.92)";
const DARK_PILL = "rgba(7, 9, 14, 0.55)";

const TEMPLATES: Record<Exclude<Template, "custom">, Base> = {
  white: {
    bg: "#F3F4F6", surface: "rgba(255, 255, 255, 0.72)", solid: "#FFFFFF", soft: "#F0F1F4",
    text: "#12151A", muted: "#5A6170", line: "rgba(18, 21, 26, 0.09)", accent: "#2347D6",
    gradEnd: "#8A919E", pill: LIGHT_PILL, glow: "rgba(18, 21, 26, 0.06)", grid: "rgba(18, 21, 26, 0.045)",
  },
  black: {
    bg: "#07090E", surface: "rgba(255, 255, 255, 0.06)", solid: "#11141A", soft: "rgba(255, 255, 255, 0.08)",
    text: "#F2F4F8", muted: "#9AA3B2", line: "rgba(255, 255, 255, 0.12)", accent: "#6EE7F9",
    gradEnd: "#8A919E", pill: "rgba(7, 9, 14, 0.45)", glow: "rgba(255, 255, 255, 0.06)", grid: "rgba(255, 255, 255, 0.035)",
    glass: true,
  },
  sand: {
    bg: "#F4EDE3", surface: "rgba(255, 252, 247, 0.82)", solid: "#FFFCF7", soft: "rgba(120, 90, 60, 0.08)",
    text: "#2B2118", muted: "#7A6A5A", line: "rgba(120, 90, 60, 0.14)", accent: "#A0522D",
    gradEnd: "#A08A74", pill: LIGHT_PILL, glow: "rgba(160, 82, 45, 0.10)", grid: "rgba(120, 90, 60, 0.06)",
  },
  pink: {
    bg: "#FBF1F2", surface: "rgba(255, 255, 255, 0.80)", solid: "#FFFFFF", soft: "rgba(190, 120, 140, 0.10)",
    text: "#2A1A20", muted: "#8A6F78", line: "rgba(190, 120, 140, 0.18)", accent: "#C2577A",
    gradEnd: "#B08A96", pill: LIGHT_PILL, glow: "rgba(232, 150, 175, 0.30)", grid: "transparent",
  },
  black_gold: {
    bg: "#0E0C0A", surface: "rgba(255, 255, 255, 0.04)", solid: "#17140F", soft: "rgba(212, 175, 55, 0.10)",
    text: "#F5EEDC", muted: "#B3A88E", line: "rgba(212, 175, 55, 0.28)", accent: "#D4AF37",
    gradEnd: "#D4AF37", pill: DARK_PILL, glow: "rgba(212, 175, 55, 0.08)", grid: "rgba(212, 175, 55, 0.07)",
  },
  vivid: {
    bg: "#5B21B6", surface: "rgba(255, 255, 255, 0.14)", solid: "#6A33BE", soft: "rgba(255, 255, 255, 0.16)",
    text: "#FFFFFF", muted: "#E2D6F2", line: "rgba(255, 255, 255, 0.30)", accent: "#FDE047",
    gradEnd: "#FDE68A", pill: DARK_PILL, glow: "rgba(249, 115, 22, 0.55)", grid: "rgba(255, 255, 255, 0.06)",
    glass: true,
  },
  green: {
    bg: "#EEF2EC", surface: "rgba(255, 255, 255, 0.76)", solid: "#FFFFFF", soft: "rgba(40, 70, 50, 0.07)",
    text: "#1E2A22", muted: "#5E6E63", line: "rgba(40, 70, 50, 0.12)", accent: "#3F7D58",
    gradEnd: "#8AA093", pill: LIGHT_PILL, glow: "rgba(63, 125, 88, 0.10)", grid: "rgba(40, 70, 50, 0.06)",
  },
};

/** Custom template input stored in pages.custom_colors. */
export type CustomColors = { colors: string[]; mode: "light" | "dark" };

export function parseCustomColors(value: unknown): CustomColors | null {
  if (!value || typeof value !== "object") return null;
  const { colors, mode } = value as Record<string, unknown>;
  if (!Array.isArray(colors) || colors.length < 1 || colors.length > 2 || !colors.every(isHexColor)) return null;
  if (mode !== "light" && mode !== "dark") return null;
  return { colors, mode };
}

/** Relative luminance 0-1 (same formula as the contrast checks). */
const luminance = (hex: string) => (contrast(hex, "#000000") - 1) / 20;

/** Derives a full palette from 1-2 colors (CLAUDE.md section 5), as in the design. */
function customBase({ colors: [main, second], mode }: CustomColors): Base {
  const two = second ?? main;
  if (mode === "dark") {
    const accent = luminance(main) < 0.2 ? mix(main, "#ffffff", 0.4) : main;
    const bg = mix(main, "#000000", 0.86);
    return {
      bg, surface: "rgba(255, 255, 255, 0.06)", solid: mix(main, "#000000", 0.78), soft: "rgba(255, 255, 255, 0.08)",
      text: "#F5F6F8", muted: mix("#F5F6F8", bg, 0.28), line: withAlpha(accent, 0.35), accent,
      gradEnd: luminance(two) < 0.2 ? mix(two, "#ffffff", 0.45) : two, pill: DARK_PILL,
      glow: withAlpha(two, 0.32), grid: withAlpha(main, 0.1), glass: true,
    };
  }
  return {
    bg: mix(main, "#ffffff", 0.9), surface: "rgba(255, 255, 255, 0.78)", solid: "#FFFFFF", soft: withAlpha(main, 0.08),
    text: "#14161B", muted: "#5A6170", line: withAlpha(main, 0.18),
    accent: luminance(main) > 0.45 ? mix(main, "#000000", 0.4) : main,
    gradEnd: luminance(two) > 0.6 ? mix(two, "#000000", 0.3) : two, pill: LIGHT_PILL,
    glow: withAlpha(two, 0.22), grid: withAlpha(main, 0.07),
  };
}

/** Soft glows down the page plus a 32px grid, as in the design. */
function background(glow: string, grid: string) {
  const glows = [
    `radial-gradient(420px 420px at 100% 300px, ${glow}, transparent 70%)`,
    `radial-gradient(460px 460px at 0% 1000px, ${glow}, transparent 70%)`,
    `radial-gradient(420px 420px at 100% 1700px, ${glow}, transparent 70%)`,
    `radial-gradient(460px 460px at 0% 2400px, ${glow}, transparent 70%)`,
  ];
  return [...glows, `linear-gradient(${grid} 1px, transparent 1px)`, `linear-gradient(90deg, ${grid} 1px, transparent 1px)`].join(", ");
}

/**
 * Final palette for a page: template (or custom colors), the creator's
 * accent if set, then contrast guards so text and the accent stay readable.
 */
export function pageTheme(template: Template, accent: string | null, customColors: unknown): PageTheme {
  const custom = template === "custom" ? parseCustomColors(customColors) : null;
  const { glow, grid, ...base } = custom ? customBase(custom) : TEMPLATES[template === "custom" ? "white" : template];
  const dark = isDark(base.bg);
  // Preset accents switch to their light/dark variant to fit the template.
  const picked = swatchFor(isHexColor(accent) ? accent : null, dark);
  const accentColor = ensureContrast(picked ?? base.accent, base.solid, 3);
  const finalAccent = ensureContrast(accentColor, base.bg, 4.5);
  return {
    ...base,
    bgImage: background(glow, grid),
    text: ensureContrast(base.text, base.bg, 7),
    muted: ensureContrast(base.muted, base.solid, 4.5),
    accent: finalAccent,
    onAccent: readableOn(finalAccent),
    // Big numbers are large text: the faded end still needs 3:1.
    gradEnd: ensureContrast(base.gradEnd, base.bg, 3),
    dark,
  };
}

export function themeStyle(theme: PageTheme): CSSProperties {
  return {
    "--page-bg": theme.bg,
    "--page-surface": theme.surface,
    "--page-solid": theme.solid,
    "--page-soft": theme.soft,
    "--page-text": theme.text,
    "--page-muted": theme.muted,
    "--page-line": theme.line,
    "--page-accent": theme.accent,
    "--page-on-accent": theme.onAccent,
    "--page-grad-end": theme.gradEnd,
    "--page-pill": theme.pill,
    "--page-panel": theme.dark ? "rgba(20, 20, 24, 0.94)" : "rgba(255, 255, 255, 0.94)",
    "--page-highlight": theme.dark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.9)",
    backgroundColor: theme.bg,
    backgroundImage: theme.bgImage,
    backgroundSize: "auto, auto, auto, auto, 32px 32px, 32px 32px",
    backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat, repeat, repeat",
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;
}
