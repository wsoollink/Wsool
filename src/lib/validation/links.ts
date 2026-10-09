import { z } from "zod";
import { decimalInput } from "@/lib/format";

export const MAX_LINKS = 10;
export const MAX_SERVICES = 12;

/** "wsool.link/x" or "http://…" typed by the creator → "https://…". Anything else is left for the check to refuse. */
export function normalizeLinkUrl(input: string) {
  const v = input.trim();
  if (!v) return v;
  if (/^http:\/\//i.test(v)) return `https://${v.slice(7)}`;
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

const file = z.object({ path: z.string().max(200).nullable().default(null), url: z.string().max(500).nullable().default(null) });
const optional = (max: number) => z.string().trim().max(max).default("");

export const linksSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(60),
      titleEn: optional(60),
      url: z.string().max(500).transform(normalizeLinkUrl).pipe(z.url({ protocol: /^https$/, hostname: /\./ })),
      image: file,
    }),
  )
  .max(MAX_LINKS);

export const servicesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(60),
      nameEn: optional(60),
      description: optional(300),
      descriptionEn: optional(300),
      /** Empty = "on request". Accepts Arabic digits and "٫". */
      price: z
        .string()
        .max(14)
        .transform((v) => decimalInput(v, 11))
        .pipe(z.union([z.literal(""), z.string().regex(/^\d{1,10}(\.\d{1,2})?$/)]))
        .transform((v) => (v === "" ? null : Number(v))),
      unit: optional(30),
      unitEn: optional(30),
    }),
  )
  .max(MAX_SERVICES);

export type LinkInput = z.input<typeof linksSchema>[number];
export type ServiceInput = z.input<typeof servicesSchema>[number];
