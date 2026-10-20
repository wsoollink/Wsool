/**
 * The newsletter body format (owner, Oct 2026): plain text with a few marks the editor's toolbar inserts,
 * turned into email-safe HTML (inline styles, tables-friendly). Everything is escaped first, so only
 * these marks become HTML:
 *
 *   ## Heading            a heading line
 *   **bold**              bold text
 *   - item                a bulleted list (every line of the block starts with "- ")
 *   [text](https://…)     a link (https, http or mailto)
 *   ![](https://…)        an image on its own line (https only)
 *   ---                   a divider
 *
 * A blank line starts a new block; a single line break stays a line break. Bare web addresses become
 * links, so old plain-text campaigns render as before.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const LINK = "color:#0060E6;text-decoration:underline;";
const INLINE = /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|\*\*([^*\n]+)\*\*|https?:\/\/[^\s<]+[^\s<.,،؛:!?)"'*]/g;

/** Inline marks inside an already escaped line: links, bold, bare web addresses. */
function inline(escaped: string) {
  return escaped.replace(INLINE, (all, text?: string, url?: string, bold?: string) => {
    if (bold !== undefined) return `<strong>${bold}</strong>`;
    if (text !== undefined) return `<a href="${url}" style="${LINK}">${text}</a>`;
    return `<a href="${all}" style="${LINK}">${all}</a>`;
  });
}

const IMAGE = /^!\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)$/;

/** A line that is always a block of its own: an image, a heading or a divider. */
const standalone = (line: string) => IMAGE.test(line) || line.startsWith("## ") || line === "---";

/** Splits the body into blocks (blank lines), with image, heading and divider lines on their own. */
function blocks(body: string): string[] {
  const out: string[] = [];
  for (const chunk of body.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    let current: string[] = [];
    for (const line of chunk.split("\n")) {
      if (standalone(line.trim())) {
        if (current.join("").trim()) out.push(current.join("\n").trim());
        out.push(line.trim());
        current = [];
      } else current.push(line);
    }
    if (current.join("").trim()) out.push(current.join("\n").trim());
  }
  return out;
}

/** Email HTML for a body written in the format above. */
export function markupToHtml(body: string): string {
  return blocks(body)
    .map((b) => {
      const img = b.match(IMAGE);
      if (img) {
        return `<p style="margin:0 0 16px;"><img src="${esc(img[2])}" alt="${esc(img[1])}" width="472" style="display:block;width:100%;max-width:472px;height:auto;border:0;border-radius:12px;"></p>`;
      }
      if (b === "---") return `<hr style="border:0;border-top:1px solid #E3E8EE;margin:22px 0;">`;
      if (b.startsWith("## ")) return `<h2 style="margin:22px 0 10px;font-size:18px;line-height:1.5;color:#021941;">${inline(esc(b.slice(3).replace(/\n/g, " ")))}</h2>`;
      const lines = b.split("\n");
      if (lines.every((l) => l.startsWith("- "))) {
        return `<ul style="margin:0 0 14px;padding-inline-start:22px;font-size:15px;line-height:1.8;color:#021941;">${lines.map((l) => `<li style="margin:0 0 4px;">${inline(esc(l.slice(2)))}</li>`).join("")}</ul>`;
      }
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#021941;">${lines.map((l) => inline(esc(l))).join("<br>")}</p>`;
    })
    .join("\n");
}

/** Plain-text copy of the same body (for the text part of the email and the inbox preview line). */
export function markupToText(body: string): string {
  return blocks(body)
    .map((b) => {
      const img = b.match(IMAGE);
      if (img) return img[1] ? `[${img[1]}]` : "";
      if (b === "---") return "—";
      return b
        .replace(/^## /, "")
        .replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, "$1 ($2)")
        .replace(/\*\*([^*\n]+)\*\*/g, "$1");
    })
    .filter(Boolean)
    .join("\n\n");
}
