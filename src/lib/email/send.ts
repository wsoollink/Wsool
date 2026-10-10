import "server-only";
import { SUPPORT_EMAIL } from "@/config/site";

export type Email = { to: string; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> };

const FROM = process.env.EMAIL_FROM || "وصول Wsool <noreply@mail.wsool.link>";
/** Overridable for local tests only. */
const API = process.env.RESEND_API_BASE || "https://api.resend.com";

const payload = (email: Email) => ({
  from: FROM, to: [email.to], subject: email.subject, html: email.html, text: email.text,
  reply_to: email.replyTo ?? SUPPORT_EMAIL, ...(email.headers && { headers: email.headers }),
});

/**
 * Sends one email through Resend (from mail.wsool.link, never a personal
 * mailbox). Without RESEND_API_KEY (local/sandbox) the email is only logged.
 * Never throws: a failed email must not break the action that triggered it.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dry-run] to=${email.to} subject=${email.subject}`);
    return false;
  }
  try {
    const res = await fetch(`${API}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(payload(email)),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}

/** Most emails Resend takes in one batch request. */
export const BATCH_SIZE = 100;

/**
 * Sends up to BATCH_SIZE emails in one Resend request (newsletter issues).
 * "no_key" when RESEND_API_KEY is missing: nothing is sent. Never throws.
 */
export async function sendBatch(emails: Email[]): Promise<"ok" | "failed" | "no_key"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dry-run] batch of ${emails.length}`);
    return "no_key";
  }
  try {
    const res = await fetch(`${API}/emails/batch`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(emails.slice(0, BATCH_SIZE).map(payload)),
    });
    if (!res.ok) console.error("[email] Resend batch error", res.status, (await res.text()).slice(0, 200));
    return res.ok ? "ok" : "failed";
  } catch (err) {
    console.error("[email] batch failed", err);
    return "failed";
  }
}
