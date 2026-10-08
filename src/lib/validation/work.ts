import { z } from "zod";
import { PLATFORMS } from "@/config/platforms";

export const MAX_BRANDS = 30;
export const MAX_WORKS = 30;

/** A file is a fresh upload (storage path) or the URL it already had (unchanged). */
const file = { path: z.string().max(200).nullable().default(null), url: z.string().max(500).nullable().default(null) };

export const brandsSchema = z
  .array(z.object({ name: z.string().trim().min(1).max(60), ...file }))
  .max(MAX_BRANDS);

const workText = z.object({ brand: z.string().trim().max(60).default(""), type: z.string().trim().max(60).default("") });

export const worksSchema = z
  .array(
    z.object({
      platform: z.enum(PLATFORMS as [string, ...string[]]).nullable().default(null),
      video: z.object(file),
      thumb: z.object(file),
      ar: workText,
      en: workText,
    }),
  )
  .max(MAX_WORKS);

export type FileRef = { path: string | null; url: string | null };
export type BrandInput = z.input<typeof brandsSchema>[number];
export type WorkInput = z.input<typeof worksSchema>[number];
