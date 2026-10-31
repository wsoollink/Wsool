import { z } from "zod";

/** Topics of the public "Contact us" form (/contact), in the order the select shows them. */
export const CONTACT_TOPICS = ["billing", "verification", "technical", "partnership", "suggestion", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const supportMessageSchema = z.object({
  name: z.string().trim().min(1, "name").max(80, "name"),
  email: z.string().trim().toLowerCase().pipe(z.email("email").max(254, "email")),
  topic: z.enum(CONTACT_TOPICS).catch("other"),
  username: z.string().trim().toLowerCase().max(60).default("").transform((v) => v.replace(/^@|^(https?:\/\/)?(www\.)?wsool\.link\//, "").slice(0, 40)),
  message: z.string().trim().min(10, "message").max(3000, "message"),
  /** Honeypot: a field people never see. Anything typed here = a bot. */
  website: z.string().max(200).default(""),
});

export type SupportMessage = z.input<typeof supportMessageSchema>;
