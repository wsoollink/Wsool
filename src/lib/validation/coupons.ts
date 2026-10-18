import { z } from "zod";
import { normalizeLinkUrl } from "@/lib/validation/links";

/** Coupons a creator can save (owner, Oct 2026); Free pages show the first FREE_LIMITS.coupons. */
export const MAX_COUPONS = 10;

/** Codes are kept as typed, without spaces (stores are case-insensitive but creators copy them exactly). */
export const normalizeCouponCode = (v: string) => v.replace(/\s+/g, "").slice(0, 30);

const file = z.object({ path: z.string().max(200).nullable().default(null), url: z.string().max(500).nullable().default(null) });
const optional = (max: number) => z.string().trim().max(max).default("");

export const couponsSchema = z
  .array(
    z.object({
      store: z.string().trim().min(1).max(40),
      storeEn: optional(40),
      description: optional(120),
      descriptionEn: optional(120),
      code: z.string().transform(normalizeCouponCode).pipe(z.string().regex(/^[\p{L}\p{N}._-]{1,30}$/u)),
      url: z.string().max(500).transform(normalizeLinkUrl).pipe(z.url({ protocol: /^https$/, hostname: /\./ })),
      /** YYYY-MM-DD, or empty for no end. */
      expiresOn: z.union([z.literal(""), z.iso.date()]).default(""),
      logo: file,
    }),
  )
  .max(MAX_COUPONS);

export type CouponInput = z.input<typeof couponsSchema>[number];
