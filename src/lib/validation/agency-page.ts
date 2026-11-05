import { z } from "zod";
import { AGENCY_ACCENTS, AGENCY_TEMPLATES } from "@/components/agency-page/theme";
import { normalizeWhatsapp, WHATSAPP_PATTERN } from "@/lib/validation/contact";
import { normalizeLinkUrl } from "@/lib/validation/links";
import { PLATFORMS } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";

export const MAX_AGENCY_ACCOUNTS = 12;
export const MAX_AGENCY_BRANDS = 30;

const text = (max: number) => z.string().trim().max(max).default("");

/** The public agency page form (agency dashboard, "صفحة الوكالة"). Empty strings are stored as null. */
export const agencyPageSchema = z.object({
  slug: z.string().trim().toLowerCase().max(20).default(""),
  published: z.boolean(),
  name: z.string().trim().min(2).max(80),
  nameEn: text(80),
  tagline: text(100),
  taglineEn: text(100),
  bio: text(800),
  bioEn: text(800),
  city: text(60),
  cityEn: text(60),
  logo: z.object({ path: z.string().max(200).nullable().default(null), url: z.string().max(500).nullable().default(null) }),
  whatsapp: z.string().max(40).transform(normalizeWhatsapp).pipe(z.union([z.literal(""), z.string().regex(WHATSAPP_PATTERN)])),
  email: z.string().trim().toLowerCase().max(254).pipe(z.union([z.literal(""), z.email()])),
  website: z.string().max(200).transform(normalizeLinkUrl).pipe(z.union([z.literal(""), z.url({ protocol: /^https$/, hostname: /\./ })])),
  template: z.enum(AGENCY_TEMPLATES),
  accent: z.enum(AGENCY_ACCENTS).nullable(),
  /** The agency's own social accounts, in order (typed by the agency, like a creator's). */
  accounts: z.array(z.object({
    platform: z.enum(PLATFORMS as [Platform, ...Platform[]]),
    handle: z.string().trim().min(1).max(300),
    followers: z.number().int().min(0).max(2_000_000_000),
  })).max(MAX_AGENCY_ACCOUNTS).default([]),
  /** Brand logos in order: { path } = fresh upload, { url } = a logo the agency already had. */
  brands: z.array(z.object({ path: z.string().max(200).nullable().default(null), url: z.string().max(500).nullable().default(null) })).max(MAX_AGENCY_BRANDS).default([]),
  /** Linked creators in page order; hidden = left off the page by the agency. */
  creators: z.array(z.object({ linkId: z.uuid(), hidden: z.boolean() })).max(500),
});

export type AgencyPageInput = z.input<typeof agencyPageSchema>;
