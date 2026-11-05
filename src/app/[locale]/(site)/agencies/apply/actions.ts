"use server";

import { SUPPORT_EMAIL } from "@/config/site";
import { db } from "@/lib/db";
import { renderEmail } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { subscribe } from "@/lib/newsletter";
import { isHuman } from "@/lib/turnstile";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { agencyRequestSchema, type AgencyRequestField, type AgencyRequestInput } from "@/lib/validation/agency-request";

export type ApplyResult = { ok: true } | { ok: false; error: AgencyRequestField | "rate" | "failed" | "captcha" };

/**
 * "Join as an agency" (/agencies/apply): saved for the owner (admin/agencies, one click opens the account) and
 * emailed to support@ with the applicant as reply-to. 5 an hour per IP, 3 a day per email.
 */
export async function applyAgency(input: AgencyRequestInput, lang: "ar" | "en", captcha?: string): Promise<ApplyResult> {
  const parsed = agencyRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: (parsed.error.issues[0]?.message as AgencyRequestField) ?? "name" };
  const r = parsed.data;
  if (r.website) return { ok: true };
  if (!(await isHuman(captcha, "agency_apply"))) return { ok: false, error: "captcha" };
  if (!(await rateLimit(`agency-apply-ip:${await clientIp()}`, 5, 3600)) || !(await rateLimit(`agency-apply:${r.email}`, 3, 86_400))) {
    return { ok: false, error: "rate" };
  }
  try {
    await db.agencyRequest.create({ data: { name: r.name, agencyName: r.agencyName, email: r.email, phone: r.phone, note: r.note || null, lang } });
  } catch {
    return { ok: false, error: "failed" };
  }
  const content = renderEmail({
    lang: "ar",
    preheader: `${r.agencyName} · ${r.name}`,
    title: `طلب انضمام وكالة: ${r.agencyName}`,
    paragraphs: [
      [`الاسم: ${r.name}`, `الوكالة: ${r.agencyName}`, `الإيميل: ${r.email}`, `الجوال: +${r.phone}`, `لغة الموقع: ${lang === "en" ? "English" : "العربية"}`].join("\n"),
      r.note,
    ].filter(Boolean),
    footer: "افتح الحساب من لوحة الإدارة ← الوكالات ← طلبات الانضمام.",
  });
  await sendEmail({ to: SUPPORT_EMAIL, subject: `[وكالة] ${r.agencyName}: ${r.name}`.slice(0, 120), replyTo: r.email, ...content }).catch(() => false);
  if (r.newsletter) await subscribe(r.email, lang, "agency-apply", "agencies").catch(() => {});
  return { ok: true };
}
