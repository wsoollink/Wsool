"use server";

import { updateTag } from "next/cache";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { pageCacheTag } from "@/lib/public-page";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";

export type ContactResult = { ok?: boolean; whatsapp?: string; email?: string; errors?: { whatsapp?: boolean; email?: boolean } };

/** Saves the WhatsApp number and contact email (empty = hidden on the page). */
export async function saveContact(input: ContactInput): Promise<ContactResult> {
  const { page } = await requireCreator();
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => i.path[0]));
    return { errors: { whatsapp: fields.has("whatsapp"), email: fields.has("email") } };
  }
  const { whatsapp, email, whatsappVisible, emailVisible } = parsed.data;
  await db.page.update({ where: { id: page.id }, data: { whatsapp: whatsapp || null, contactEmail: email || null, whatsappVisible, emailVisible } });
  updateTag(pageCacheTag(page.username));
  return { ok: true, whatsapp, email };
}
