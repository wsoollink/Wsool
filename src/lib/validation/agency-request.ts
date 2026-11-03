import { z } from "zod";
import { normalizeWhatsapp } from "@/lib/validation/contact";

/** "Join as an agency" form (/agencies/apply). Shared by the browser and the server action. */
export const agencyRequestSchema = z.object({
  name: z.string().trim().min(2, "name").max(80, "name"),
  agencyName: z.string().trim().min(2, "agencyName").max(80, "agencyName"),
  email: z.string().trim().toLowerCase().pipe(z.email("email").max(254, "email")),
  phone: z.string().max(40, "phone").transform(normalizeWhatsapp).pipe(z.string().regex(/^[0-9]{8,15}$/, "phone")),
  note: z.string().trim().max(1000, "note").default(""),
  /** Honeypot: a field people never see. */
  website: z.string().max(200).default(""),
});
export type AgencyRequestInput = z.input<typeof agencyRequestSchema>;
export type AgencyRequestField = "name" | "agencyName" | "email" | "phone" | "note";
