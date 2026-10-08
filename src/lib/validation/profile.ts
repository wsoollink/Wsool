import { z } from "zod";

/** Trimmed text with a max length; empty is allowed (field left blank). */
const text = (max: number) => z.string().trim().max(max).default("");

export const translationSchema = z.object({
  fullName: text(80),
  specialty: text(80),
  bio: text(500),
  city: text(60),
  country: text(60),
});

export const profileSchema = z
  .object({
    primaryLang: z.enum(["ar", "en"]),
    enEnabled: z.boolean(),
    ar: translationSchema,
    en: translationSchema,
  })
  .superRefine((value, ctx) => {
    // The page always needs a name in its primary language.
    if (!value[value.primaryLang].fullName) {
      ctx.addIssue({ code: "custom", path: [value.primaryLang, "fullName"], message: "required" });
    }
    if (value.primaryLang === "ar" && value.enEnabled && !value.en.fullName) {
      ctx.addIssue({ code: "custom", path: ["en", "fullName"], message: "required" });
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export const TRANSLATION_FIELDS = ["fullName", "specialty", "bio", "city", "country"] as const;

export const MAX_TAGS = 12;
export const tagsSchema = z.object({
  lang: z.enum(["ar", "en"]),
  labels: z.array(z.string().trim().min(1).max(18)).max(MAX_TAGS),
});

export const MAX_LICENSES = 10;
export const licensesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(60),
      nameEn: z.string().trim().max(60).default(""),
      number: z.string().trim().min(1).max(60),
      /** A newly uploaded file (storage path) ... */
      filePath: z.string().max(200).nullable().default(null),
      /** ... or the file already saved on this license (unchanged). */
      fileUrl: z.string().max(500).nullable().default(null),
    }),
  )
  .max(MAX_LICENSES);
