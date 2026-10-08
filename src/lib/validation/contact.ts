import { z } from "zod";

/**
 * WhatsApp number in international form, digits only (what wa.me expects).
 * Accepts what people usually type: "+966 50 123 4567", "00966501234567",
 * Arabic digits, or a Saudi local number ("0501234567" / "501234567").
 */
export function normalizeWhatsapp(input: string): string {
  let digits = input.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf)).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^05\d{8}$/.test(digits)) digits = `966${digits.slice(1)}`;
  else if (/^5\d{8}$/.test(digits)) digits = `966${digits}`;
  return digits;
}

export const WHATSAPP_PATTERN = /^[1-9]\d{7,14}$/;

export const contactSchema = z.object({
  whatsapp: z.string().max(40).transform(normalizeWhatsapp).pipe(z.union([z.literal(""), z.string().regex(WHATSAPP_PATTERN)])),
  email: z.string().trim().toLowerCase().max(254).pipe(z.union([z.literal(""), z.email()])),
});

export type ContactInput = z.input<typeof contactSchema>;
