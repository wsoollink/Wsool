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

/** Web pages (the Academy) get classes instead of inline colours, so dark mode works. */
type Mode = "email" | "web";
const linkAttrs = (url: string, mode: Mode) =>
  mode === "email" ? `style="${LINK}"`
    // Our own pages open in place; other sites in a new tab (nofollow: links in articles aren't endorsements).
    : /^https:\/\/(www\.)?wsool\.link(\/|$)/.test(url) || url.startsWith("mailto:") ? `class="ac-link"` : `class="ac-link" target="_blank" rel="noopener nofollow"`;

/** Links, bold, italic and bare web addresses inside an already escaped piece of a line. */
function marks(escaped: string, mode: Mode = "email") {
  return escaped.replace(INLINE, (all, text?: string, url?: string, bold?: string, italic?: string) => {
    if (bold !== undefined) return `<strong>${bold}</strong>`;
    if (italic !== undefined) return `<em>${italic}</em>`;
    if (text !== undefined) return `<a href="${url}" ${linkAttrs(url!, mode)}>${text}</a>`;
    return `<a href="${all}" ${linkAttrs(all, mode)}>${all}</a>`;
  });
}

/** Inline marks inside an already escaped line, with coloured spans around the other marks. */
function inline(escaped: string, mode: Mode = "email") {
  let out = "", last = 0;
  for (const m of escaped.matchAll(COLOR)) {
    const span = mode === "web" ? `<span class="ac-${m[1]}">` : `<span style="color:${TEXT_COLORS[m[1] as keyof typeof TEXT_COLORS]};">`;
    out += marks(escaped.slice(last, m.index), mode) + span + marks(m[2], mode) + "</span>";
    last = m.index + m[0].length;
  }
  return out + marks(escaped.slice(last), mode);
}

const IMAGE = /^!\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)$/;
const NUMBERED = /^\d{1,3}[.)] /;
const WRAP = /^\[(\/?)(center|box)\]$/;

/** A line that is always a block of its own: an image, a heading or a divider. */
const standalone = (line: string) => IMAGE.test(line) || line.startsWith("## ") || line === "---";

/** What a line is, for grouping: a bullet item, a numbered item, or text. */
const lineKind = (line: string) => (line.startsWith("- ") ? "ul" : NUMBERED.test(line) ? "ol" : "text");

/**
 * Splits text into blocks (blank lines), with image, heading and divider lines on their own. A list that follows a
 * line of text without a blank line between still becomes its own list block (and the text after it a paragraph).
 */
function blocks(body: string): string[] {
  const out: string[] = [];
  const push = (lines: string[]) => { if (lines.join("").trim()) out.push(lines.join("\n").trim()); };
  for (const chunk of body.split(/\n\s*\n/)) {
    let current: string[] = [];
    let kind = "";
    for (const raw of chunk.split("\n")) {
      const line = raw.trim();
      if (standalone(line)) {
        push(current);
        out.push(line);
        current = []; kind = "";
        continue;
      }
      const k = lineKind(line);
      if (current.length && k !== kind) { push(current); current = []; }
      current.push(raw); kind = k;
    }
    push(current);
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

function blockHtml(b: string, center: boolean, headingFont?: string) {
  const align = center ? "text-align:center;" : "";
  const img = b.match(IMAGE);
  if (img) {
    return `<p style="margin:0 0 16px;${align}"><img src="${esc(img[2])}" alt="${esc(img[1])}" width="472" style="display:block;width:100%;max-width:472px;height:auto;border:0;border-radius:12px;${center ? "margin:0 auto;" : ""}"></p>`;
  }
  if (b === "---") return `<hr style="border:0;border-top:1px solid #E3E8EE;margin:22px 0;">`;
  if (b.startsWith("## ")) return `<h2 style="margin:22px 0 10px;${headingFont ? `font-family:${headingFont};font-weight:700;` : ""}font-size:18px;line-height:1.5;color:#021941;${align}">${inline(esc(b.slice(3).replace(/\n/g, " ")))}</h2>`;
  const lines = b.split("\n");
  const list = lines.every((l) => l.startsWith("- ")) ? "ul" : lines.every((l) => NUMBERED.test(l)) ? "ol" : null;
  if (list) {
    const items = lines.map((l) => `<li style="margin:0 0 4px;">${inline(esc(l.replace(list === "ul" ? /^- / : NUMBERED, "")))}</li>`).join("");
    const place = center ? "list-style-position:inside;padding:0;" : "padding-inline-start:22px;";
    return `<${list} style="margin:0 0 14px;${place}font-size:15px;line-height:1.8;color:#021941;${align}">${items}</${list}>`;
  }
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#021941;${align}">${lines.map((l) => inline(esc(l))).join("<br>")}</p>`;
}

/** Email HTML for a body written in the format above; `headingFont` = CSS font-family for the ## headings. */
export function markupToHtml(body: string, headingFont?: string): string {
  return sections(body)
    .map(({ text, center, box }) => {
      const html = blocks(text).map((b) => blockHtml(b, center, headingFont)).join("\n");
      if (!html || !box) return html;
      // A table, so Outlook keeps the background and the padding.
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border-collapse:separate;"><tr><td style="background:#EEF4FF;border:1px solid #D6E4FF;border-radius:12px;padding:16px 18px 2px;">${html}</td></tr></table>`;
    })
    .filter(Boolean)
    .join("\n");
}

/** Readable id for a heading (anchor links in the Academy's table of contents). */
export const headingId = (i: number) => `h-${i + 1}`;

function webBlock(b: string, center: boolean, heading: { n: number }) {
  const c = center ? " ac-center" : "";
  const img = b.match(IMAGE);
  if (img) return `<figure class="ac-figure${c}"><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy" decoding="async"></figure>`;
  if (b === "---") return `<hr class="ac-hr">`;
  if (b.startsWith("## ")) {
    const text = b.slice(3).replace(/\n/g, " ");
    return `<h2 id="${headingId(heading.n++)}" class="ac-h2${c}">${inline(esc(text), "web")}</h2>`;
  }
  const lines = b.split("\n");
  const list = lines.every((l) => l.startsWith("- ")) ? "ul" : lines.every((l) => NUMBERED.test(l)) ? "ol" : null;
  if (list) return `<${list} class="ac-${list}${c}">${lines.map((l) => `<li>${inline(esc(l.replace(list === "ul" ? /^- / : NUMBERED, "")), "web")}</li>`).join("")}</${list}>`;
  return `<p class="ac-p${c}">${lines.map((l) => inline(esc(l), "web")).join("<br>")}</p>`;
}

/** Web HTML for the same format (Academy articles): classes styled in globals.css (`.ac-*`), headings get ids. */
export function markupToWebHtml(body: string): string {
  const heading = { n: 0 };
  return sections(body)
    .map(({ text, center, box }) => {
      const html = blocks(text).map((b) => webBlock(b, center, heading)).join("\n");
      return html && box ? `<div class="ac-box">${html}</div>` : html;
    })
    .filter(Boolean)
    .join("\n");
}

/** The ## headings of a body, in order (the article's table of contents). */
export function markupHeadings(body: string): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (const { text } of sections(body)) for (const b of blocks(text)) {
    if (b.startsWith("## ")) {
      const t = b.slice(3).replace(/\n/g, " ");
      out.push({ id: headingId(out.length), text: t.replace(COLOR, "$2").replace(/\*\*?([^*\n]+)\*\*?/g, "$1").replace(/\[([^\]\n]+)\]\([^\s)]+\)/g, "$1") });
    }
  }
  return out;
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
