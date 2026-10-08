import type { CSSProperties } from "react";
import type { Template } from "@/generated/prisma/enums";

/** Colors a creator page template provides, as CSS variables. */
export type PageTheme = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
};

// Only White for now; the other templates are added in the next step.
const WHITE: PageTheme = {
  bg: "#FFFFFF",
  surface: "#F4F6FA",
  text: "#021941",
  muted: "#56607A",
  line: "rgba(2, 25, 65, 0.09)",
  accent: "#0060E6",
};

export function pageTheme(_template: Template, accent: string | null): PageTheme {
  return { ...WHITE, accent: accent ?? WHITE.accent };
}

export function themeStyle(theme: PageTheme): CSSProperties {
  return {
    "--page-bg": theme.bg,
    "--page-surface": theme.surface,
    "--page-text": theme.text,
    "--page-muted": theme.muted,
    "--page-line": theme.line,
    "--page-accent": theme.accent,
  } as CSSProperties;
}
