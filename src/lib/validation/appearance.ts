import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((v) => v.toLowerCase());

export const TEMPLATES = ["white", "black", "sand", "pink", "black_gold", "vivid", "green", "custom"] as const;

export const appearanceSchema = z
  .object({
    template: z.enum(TEMPLATES),
    customColors: z.object({ colors: z.array(hex).min(1).max(2), mode: z.enum(["light", "dark"]) }).nullable(),
    /** null = the template's own accent; otherwise one of ACCENT_SWATCHES (stored as its light hex). */
    accent: hex.refine((v) => ACCENT_SWATCHES.some((s) => s.light === v), { message: "preset" }).nullable(),
    numberFont: z.enum(["wide", "text"]),
    hideBranding: z.boolean(),
  })
  .refine((v) => v.template !== "custom" || v.customColors !== null, { path: ["customColors"] });

export type AppearanceInput = z.input<typeof appearanceSchema>;

/**
 * Accent colors from the design (owner decision: presets only, no free
 * picker). Each has a lighter variant used on dark templates.
 */
export const ACCENT_SWATCHES = [
  { key: "blue", light: "#0060e6", dark: "#7dd3fc" },
  { key: "green", light: "#0f766e", dark: "#34d399" },
  { key: "orange", light: "#b4410c", dark: "#fb923c" },
  { key: "purple", light: "#6d28d9", dark: "#a78bfa" },
  { key: "pink", light: "#be185d", dark: "#f472b6" },
] as const;

/** The swatch variant that fits the background (light/dark template). */
export function swatchFor(accent: string | null, dark: boolean): string | null {
  const s = accent && ACCENT_SWATCHES.find((x) => x.light === accent.toLowerCase() || x.dark === accent.toLowerCase());
  return s ? (dark ? s.dark : s.light) : accent;
}
