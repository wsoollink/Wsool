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
