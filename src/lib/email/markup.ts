/**
 * The newsletter body format (owner, Oct 2026): plain text with a few marks the editor's toolbar inserts,
 * turned into email-safe HTML (inline styles, tables-friendly). Everything is escaped first, so only
 * these marks become HTML:
 *
 *   ## Heading            a heading line
 *   **bold**  *italic*    bold / italic text
 *   [blue]text[/blue]     coloured text (blue, green, red, gray: the brand's status colours)
 *   - item                a bulleted list (every line of the block starts with "- ")
 *   1. item               a numbered list (every line starts with "1. ", "2. "…)
 *   [text](https://…)     a link (https, http or mailto)
 *   ![](https://…)        an image on its own line (https only)
 *   ---                   a divider
 *   [center] … [/center]  centred blocks (each mark on its own line)
 *   [box] … [/box]        a highlighted box (each mark on its own line)
 *
 * A blank line starts a new block; a single line break stays a line break. Bare web addresses become
 * links, so old plain-text campaigns render as before.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const TEXT_COLORS = { blue: "#0060E6", green: "#12805C", red: "#C0362C", gray: "#56607A" } as const;

const LINK = "color:#0060E6;text-decoration:underline;";
const INLINE = /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|https?:\/\/[^\s<]+[^\s<.,،؛:!?)"'*[]/g;
const COLOR = /\[(blue|green|red|gray)\]([^\n]+?)\[\/\1\]/g;

/** Links, bold, italic and bare web addresses inside an already escaped piece of a line. */
function marks(escaped: string) {
  return escaped.replace(INLINE, (all, text?: string, url?: string, bold?: string, italic?: string) => {
    if (bold !== undefined) return `<strong>${bold}</strong>`;
    if (italic !== undefined) return `<em>${italic}</em>`;
    if (text !== undefined) return `<a href="${url}" style="${LINK}">${text}</a>`;
    return `<a href="${all}" style="${LINK}">${all}</a>`;
  });
}

/** Inline marks inside an already escaped line, with coloured spans around the other marks. */
function inline(escaped: string) {
  let out = "", last = 0;
  for (const m of escaped.matchAll(COLOR)) {
    out += marks(escaped.slice(last, m.index)) + `<span style="color:${TEXT_COLORS[m[1] as keyof typeof TEXT_COLORS]};">${marks(m[2])}</span>`;
    last = m.index + m[0].length;
  }
  return out + marks(escaped.slice(last));
}

const IMAGE = /^!\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)$/;
const NUMBERED = /^\d{1,3}[.)] /;
const WRAP = /^\[(\/?)(center|box)\]$/;

/** A line that is always a block of its own: an image, a heading or a divider. */
const standalone = (line: string) => IMAGE.test(line) || line.startsWith("## ") || line === "---";

/** Splits text into blocks (blank lines), with image, heading and divider lines on their own. */
function blocks(body: string): string[] {
  const out: string[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
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

type Section = { text: string; center: boolean; box: boolean };

/** Cuts the body at [center]/[box] mark lines; an unclosed mark runs to the end, a stray closing one is ignored. */
function sections(body: string): Section[] {
  const out: Section[] = [];
  const open = { center: 0, box: 0 };
  let current: string[] = [];
  const flush = () => {
    if (current.join("").trim()) out.push({ text: current.join("\n"), center: open.center > 0, box: open.box > 0 });
    current = [];
  };
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    const mark = line.trim().match(WRAP);
    if (!mark) { current.push(line); continue; }
    flush();
    const kind = mark[2] as "center" | "box";
    open[kind] = mark[1] ? Math.max(0, open[kind] - 1) : open[kind] + 1;
  }
  flush();
  return out;
}

function blockHtml(b: string, center: boolean) {
  const align = center ? "text-align:center;" : "";
  const img = b.match(IMAGE);
  if (img) {
    return `<p style="margin:0 0 16px;${align}"><img src="${esc(img[2])}" alt="${esc(img[1])}" width="472" style="display:block;width:100%;max-width:472px;height:auto;border:0;border-radius:12px;${center ? "margin:0 auto;" : ""}"></p>`;
  }
  if (b === "---") return `<hr style="border:0;border-top:1px solid #E3E8EE;margin:22px 0;">`;
  if (b.startsWith("## ")) return `<h2 style="margin:22px 0 10px;font-size:18px;line-height:1.5;color:#021941;${align}">${inline(esc(b.slice(3).replace(/\n/g, " ")))}</h2>`;
  const lines = b.split("\n");
  const list = lines.every((l) => l.startsWith("- ")) ? "ul" : lines.every((l) => NUMBERED.test(l)) ? "ol" : null;
  if (list) {
    const items = lines.map((l) => `<li style="margin:0 0 4px;">${inline(esc(l.replace(list === "ul" ? /^- / : NUMBERED, "")))}</li>`).join("");
    const place = center ? "list-style-position:inside;padding:0;" : "padding-inline-start:22px;";
    return `<${list} style="margin:0 0 14px;${place}font-size:15px;line-height:1.8;color:#021941;${align}">${items}</${list}>`;
  }
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#021941;${align}">${lines.map((l) => inline(esc(l))).join("<br>")}</p>`;
}

/** Email HTML for a body written in the format above. */
export function markupToHtml(body: string): string {
  return sections(body)
    .map(({ text, center, box }) => {
      const html = blocks(text).map((b) => blockHtml(b, center)).join("\n");
      if (!html || !box) return html;
      // A table, so Outlook keeps the background and the padding.
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border-collapse:separate;"><tr><td style="background:#EEF4FF;border:1px solid #D6E4FF;border-radius:12px;padding:16px 18px 2px;">${html}</td></tr></table>`;
    })
    .filter(Boolean)
    .join("\n");
}

/** Plain-text copy of the same body (for the text part of the email and the inbox preview line). */
export function markupToText(body: string): string {
  return sections(body)
    .flatMap(({ text }) => blocks(text))
    .map((b) => {
      const img = b.match(IMAGE);
      if (img) return img[1] ? `[${img[1]}]` : "";
      if (b === "---") return "—";
      return b
        .replace(/^## /, "")
        .replace(COLOR, "$2")
        .replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, "$1 ($2)")
        .replace(/\*\*([^*\n]+)\*\*/g, "$1")
        .replace(/\*([^*\n]+)\*/g, "$1");
    })
    .filter(Boolean)
    .join("\n\n");
}
