import "server-only";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Escaped text with web links made clickable and line breaks kept. */
const rich = (s: string) =>
  esc(s)
    .replace(/https?:\/\/[^\s<]+[^\s<.,،؛:!?)"']/g, (url) => `<a href="${url}" style="color:#0060E6;text-decoration:underline;">${url}</a>`)
    .replace(/\n/g, "<br>");

export type EmailContent = {
  lang: "ar" | "en";
  /** Inbox preview line. */
  preheader: string;
  title: string;
  /** Paragraphs (plain text, escaped here; links become clickable, line breaks are kept). */
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Small print at the bottom (why they got it, how to change it). */
  footer: string;
};

/**
 * One branded, mobile-friendly email layout (tables + inline styles, which
 * mail apps need). Arabic is right-to-left. Returns HTML and a plain-text copy.
 */
export function renderEmail(c: EmailContent): { html: string; text: string } {
  const dir = c.lang === "ar" ? "rtl" : "ltr";
  const align = c.lang === "ar" ? "right" : "left";
  const font = c.lang === "ar" ? "Tahoma, 'Segoe UI', Arial, sans-serif" : "-apple-system, 'Segoe UI', Arial, sans-serif";
  const html = `<!doctype html>
<html lang="${c.lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.title)}</title></head>
<body style="margin:0;padding:0;background:#F4F6FA;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td dir="${dir}" style="padding:0 8px 16px;text-align:${align};font-family:${font};font-size:22px;font-weight:700;color:#0A6CFF;">${c.lang === "ar" ? "وصول" : "Wsool"}</td></tr>
<tr><td dir="${dir}" style="background:#ffffff;border:1px solid rgba(2,25,65,0.09);border-radius:20px;padding:28px 24px;text-align:${align};font-family:${font};color:#021941;">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.5;">${esc(c.title)}</h1>
${c.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#021941;">${rich(p)}</p>`).join("\n")}
${c.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr><td style="border-radius:999px;background:#021941;"><a href="${esc(c.cta.url)}" style="display:inline-block;padding:13px 26px;font-family:${font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(c.cta.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td dir="${dir}" style="padding:16px 8px;text-align:${align};font-family:${font};font-size:12px;line-height:1.7;color:#56607A;">${rich(c.footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [c.title, "", ...c.paragraphs, ...(c.cta ? ["", `${c.cta.label}: ${c.cta.url}`] : []), "", "—", c.footer].join("\n");
  return { html, text };
}
