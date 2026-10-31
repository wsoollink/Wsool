"use server";

import { SUPPORT_EMAIL } from "@/config/site";
import { sendEmail } from "@/lib/email/send";
import { renderEmail } from "@/lib/email/layout";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { supportMessageSchema, type SupportMessage } from "@/lib/validation/support-message";

export type ContactResult = { ok: true } | { ok: false; error: "name" | "email" | "message" | "rate" | "failed" };

const TOPIC_NAMES = {
  billing: "اشتراك وفواتير", verification: "توثيق الحسابات", technical: "مشكلة تقنية",
  partnership: "شراكة أو تعاون", suggestion: "اقتراح", other: "أخرى",
} as const;

/**
 * "Contact us" form: emails the message to support@ with the visitor as reply-to, so a reply in Gmail goes straight
 * back to them. Nothing is stored. Limits: 5 messages an hour per IP, 3 per email address.
 */
export async function sendSupportMessage(input: SupportMessage, lang: "ar" | "en"): Promise<ContactResult> {
  const parsed = supportMessageSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { ok: false, error: first === "name" || first === "email" ? first : "message" };
  }
  const m = parsed.data;
  // Bots fill the hidden field: answer as if it worked, send nothing.
  if (m.website) return { ok: true };
  if (!(await rateLimit(`contact-ip:${await clientIp()}`, 5, 3600)) || !(await rateLimit(`contact-email:${m.email}`, 3, 3600))) {
    return { ok: false, error: "rate" };
  }

  const details = [
    `الاسم: ${m.name}`,
    `الإيميل: ${m.email}`,
    `النوع: ${TOPIC_NAMES[m.topic]}`,
    m.username ? `الصفحة: https://wsool.link/${m.username}` : "",
    `لغة الموقع: ${lang === "en" ? "English" : "العربية"}`,
  ].filter(Boolean).join("\n");
  const content = renderEmail({
    lang: "ar",
    preheader: m.message.slice(0, 90),
    title: `رسالة جديدة: ${TOPIC_NAMES[m.topic]}`,
    paragraphs: [details, m.message],
    footer: "وصلت من نموذج «تواصل معنا» في wsool.link. اضغط «رد» للرد على المرسل مباشرة.",
  });
  const sent = await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[تواصل] ${TOPIC_NAMES[m.topic]}: ${m.name}`.slice(0, 120),
    replyTo: m.email,
    ...content,
  });
  // Without a Resend key (local) the email is only logged: still a success for the visitor.
  return sent || !process.env.RESEND_API_KEY ? { ok: true } : { ok: false, error: "failed" };
}
