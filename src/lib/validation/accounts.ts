import { z } from "zod";
import { HANDLE_PATTERN, normalizeHandle, PLATFORMS } from "@/config/platforms";

export const MAX_ACCOUNTS = 12;
export const MAX_FOLLOWERS = 2_000_000_000;

export const accountsSchema = z
  .array(
    z.object({
      /** Existing account id, or null for a new one. */
      id: z.uuid().nullable(),
      platform: z.enum(PLATFORMS as [string, ...string[]]),
      handle: z.string().transform(normalizeHandle).pipe(z.string().regex(HANDLE_PATTERN)),
      followers: z.number().int().min(0).max(MAX_FOLLOWERS),
    }),
  )
  .max(MAX_ACCOUNTS);

export type AccountInput = z.input<typeof accountsSchema>[number];

export const monthlyViewsSchema = z.number().int().min(0).max(1e12).nullable();

/** Audience shares: fixed groups, whole percents, each group adds up to 100 or less. */
export const AGE_GROUPS = ["13-17", "18-24", "25-34", "35-44", "45+"] as const;
export const MAX_AUDIENCE_ROWS = 5;

const percent = z.number().int().min(0).max(100);
const share = (label: z.ZodType<string>) => z.object({ label, percent });
const group = <T extends z.ZodType<{ percent: number }>>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .refine((list) => list.reduce((sum, s) => sum + s.percent, 0) <= 100, "over_100")
    .transform((list) => list.filter((s) => s.percent > 0));

export const audienceSchema = z.object({
  gender: group(share(z.enum(["female", "male"])), 2),
  ages: group(share(z.enum(AGE_GROUPS)), AGE_GROUPS.length),
  countries: group(share(z.string().regex(/^[A-Z]{2}$/)), MAX_AUDIENCE_ROWS),
  cities: group(share(z.string().trim().min(1).max(40)), MAX_AUDIENCE_ROWS),
});

export type AudienceInput = z.input<typeof audienceSchema>;
