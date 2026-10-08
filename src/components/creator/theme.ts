import type { CSSProperties } from "react";
import type { Template } from "@/generated/prisma/enums";
import { ensureContrast, isDark, isHexColor, mix, readableOn, withAlpha } from "@/lib/color";

/** Colors a creator page template provides, as CSS variables. */
export type PageTheme = {
  bg: string;
  /** Optional background image (gradients) layered over `bg`. */
  bgImage?: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  /** Text on accent-colored buttons. */
  onAccent: string;
  /** Frosted cards (Black template). */
  glass?: boolean;
  dark: boolean;
};

type Base = Omit<PageTheme, "onAccent" | "dark">;

const TEMPLATES: Record<Exclude<Template, "custom">, Base> = {
  white: {
    bg: "#ffffff", surface: "#f4f6fa", text: "#021941", muted: "#56607a",
    line: "rgba(2, 25, 65, 0.09)", accent: "#0060e6",
  },
  black: {
    bg: "#0b0d12",
    bgImage: "radial-gradient(60% 40% at 15% 0%, rgba(10, 108, 255, 0.35), transparent), radial-gradient(50% 35% at 100% 30%, rgba(34, 184, 240, 0.22), transparent)",
    surface: "rgba(255, 255, 255, 0.07)", text: "#f5f7fa", muted: "#a3aab8",
    line: "rgba(255, 255, 255, 0.12)", accent: "#4c9dff", glass: true,
  },
  sand: {
    bg: "#f5efe6", surface: "#fbf7f1", text: "#3b2f24", muted: "#7a6a58",
    line: "rgba(59, 47, 36, 0.12)", accent: "#a0522d",
  },
  pink: {
    bg: "#fff1f5", surface: "#ffffff", text: "#3d1028", muted: "#8a5a6e",
    line: "rgba(61, 16, 40, 0.1)", accent: "#d6336c",
  },
  black_gold: {
    bg: "#0e0c08", surface: "#1a1710", text: "#f6efd9", muted: "#b9ae8e",
    line: "rgba(212, 175, 55, 0.22)", accent: "#d4af37",
  },
  vivid: {
    bg: "#f6f3ff",
    bgImage: "linear-gradient(160deg, rgba(124, 58, 237, 0.16), rgba(236, 72, 153, 0.12) 45%, transparent 70%)",
    surface: "#ffffff", text: "#1b1340", muted: "#5b5480",
    line: "rgba(27, 19, 64, 0.1)", accent: "#7c3aed",
  },
  green: {
    bg: "#f0f7f2", surface: "#ffffff", text: "#0f2a1d", muted: "#4f6b5c",
    line: "rgba(15, 42, 29, 0.1)", accent: "#12805c",
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

/** Derives a full palette from 1-2 colors (CLAUDE.md section 5). */
function customBase({ colors: [main, second], mode }: CustomColors): Base {
  const accentSeed = second ?? main;
  if (mode === "dark") {
    const bg = mix(main, "#000000", 0.86);
    const text = "#f5f7fa";
    return {
      bg, surface: mix(main, "#000000", 0.76), text, muted: mix(text, bg, 0.38),
      line: withAlpha("#ffffff", 0.12), accent: accentSeed,
    };
  }
  const bg = mix(main, "#ffffff", 0.93);
  const text = mix(main, "#000000", 0.82);
  return {
    bg, surface: mix(main, "#ffffff", 0.97), text, muted: mix(text, bg, 0.38),
    line: withAlpha(text, 0.1), accent: accentSeed,
  };
}

/**
 * Final palette for a page: template (or custom colors), the creator's
 * accent if set, then contrast guards so text and the accent stay readable.
 */
export function pageTheme(template: Template, accent: string | null, customColors: unknown): PageTheme {
  const custom = template === "custom" ? parseCustomColors(customColors) : null;
  const base: Base = custom ? customBase(custom) : TEMPLATES[template === "custom" ? "white" : template];
  const dark = isDark(base.bg);
  const solidSurface = base.glass ? base.bg : base.surface;
  const accentColor = ensureContrast(isHexColor(accent) ? accent : base.accent, solidSurface, 3);
  return {
    ...base,
    text: ensureContrast(base.text, base.bg, 7),
    muted: ensureContrast(base.muted, solidSurface, 4.5),
    accent: ensureContrast(accentColor, base.bg, 4.5),
    onAccent: readableOn(ensureContrast(accentColor, base.bg, 4.5)),
    dark,
  };
}

export function themeStyle(theme: PageTheme): CSSProperties {
  return {
    "--page-bg": theme.bg,
    "--page-surface": theme.surface,
    "--page-text": theme.text,
    "--page-muted": theme.muted,
    "--page-line": theme.line,
    "--page-accent": theme.accent,
    "--page-on-accent": theme.onAccent,
    backgroundColor: theme.bg,
    backgroundImage: theme.bgImage,
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;
}
