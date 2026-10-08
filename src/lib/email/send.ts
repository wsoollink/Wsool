import "server-only";

export type Email = { to: string; subject: string; html: string; text: string; replyTo?: string };

const FROM = process.env.EMAIL_FROM || "وصول Wsool <noreply@mail.wsool.link>";

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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email.to], subject: email.subject, html: email.html, text: email.text, reply_to: email.replyTo ?? "support@wsool.link" }),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}
