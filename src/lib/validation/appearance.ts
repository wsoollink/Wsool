import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((v) => v.toLowerCase());

export const TEMPLATES = ["white", "black", "sand", "pink", "black_gold", "vivid", "green", "custom"] as const;

export const appearanceSchema = z
  .object({
    template: z.enum(TEMPLATES),
    customColors: z.object({ colors: z.array(hex).min(1).max(2), mode: z.enum(["light", "dark"]) }).nullable(),
    /** null = the template's own accent. */
    accent: hex.nullable(),
    numberFont: z.enum(["wide", "text"]),
    hideBranding: z.boolean(),
  })
  .refine((v) => v.template !== "custom" || v.customColors !== null, { path: ["customColors"] });

export type AppearanceInput = z.input<typeof appearanceSchema>;

/** Accent presets offered next to the free color picker. */
export const ACCENT_PRESETS = ["#0060e6", "#7c3aed", "#d6336c", "#e8590c", "#12805c", "#0c8599", "#a0522d", "#d4af37"];
