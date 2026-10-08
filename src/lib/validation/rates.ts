import { z } from "zod";

export const MAX_RATES = 10;
export const MAX_BUNDLES = 5;
export const MAX_PRICE = 10_000_000;

const price = z.number().finite().min(0).max(MAX_PRICE);
const rate = z.object({
  name: z.string().trim().min(1).max(40),
  nameEn: z.string().trim().max(40).default(""),
  price: price.transform((v) => Math.round(v * 100) / 100),
});

export const ratesSchema = z.array(rate).max(MAX_RATES);

export const bundlesSchema = z
  .array(
    z.object({
      name: z.string().trim().max(40).default(""),
      nameEn: z.string().trim().max(40).default(""),
      accountIds: z.array(z.uuid()).min(2).max(12),
      rates: z.array(rate).min(1).max(MAX_RATES),
    }),
  )
  .max(MAX_BUNDLES);

export const rateSettingsSchema = z.object({
  showOnPage: z.boolean(),
  showInPdf: z.boolean(),
  currency: z.enum(["SAR", "USD"]),
  vatIncluded: z.boolean(),
});

export type RateInput = z.input<typeof rate>;
export type BundleInput = z.input<typeof bundlesSchema>[number];
export type RateSettingsInput = z.infer<typeof rateSettingsSchema>;

/** Suggested rate type names (the creator can type any name). */
export const RATE_NAME_SUGGESTIONS = {
  ar: ["فيديو", "ستوري", "منشور", "بث مباشر", "ذكر في فيديو", "حضور فعالية"],
  en: ["Video", "Story", "Post", "Live", "Mention", "Event attendance"],
} as const;
