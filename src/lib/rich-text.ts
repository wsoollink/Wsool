import { markupToDoc } from "@/lib/email/markup";

/**
 * Rich text for newsletter issues and Academy articles (owner, Nov 2026). The admin editor (TipTap) saves a JSON document
 * in the same `body` column the old text format used; `toDoc()` reads either (old bodies are converted on the fly, so
 * nothing needs migrating). Everything a browser sends goes through `sanitizeDoc()`: only the nodes, marks, colours and
 * sizes below survive, links must be https/mailto and images https. Pure (no server imports): the editor uses it too.
 */

export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = { type: string; attrs?: Record<string, unknown>; content?: RichNode[]; text?: string; marks?: RichMark[] };
export type RichDoc = { type: "doc"; content: RichNode[] };

/** Text colours (name → hex). The editor offers only these; any other colour is dropped. */
export const RICH_COLORS = {
  navy: "#021941", blue: "#0060E6", cyan: "#0B7FAE", green: "#12805C", orange: "#B45309", red: "#C0362C", purple: "#6D28D9", gray: "#56607A",
} as const;
/** Highlighter colours (light backgrounds that keep navy text readable). */
export const RICH_HIGHLIGHTS = { yellow: "#FEF08A", blue: "#DBEAFE", green: "#D1FAE5", pink: "#FCE7F3", gray: "#E5E7EB" } as const;
/** Text sizes besides normal, as the editor stores them. */
export const RICH_SIZES = { small: "0.875em", large: "1.25em" } as const;
export const BOX_TONES = {
  blue: { bg: "#EEF4FF", border: "#D6E4FF" }, green: { bg: "#ECFDF5", border: "#BBF7D0" },
  amber: { bg: "#FFFBEB", border: "#FDE68A" }, gray: { bg: "#F4F6FA", border: "#E3E8EE" },
} as const;
export const BUTTON_COLORS = { navy: "#021941", blue: "#0060E6", green: "#12805C" } as const;
export const IMAGE_SIZES = { full: 472, medium: 320, small: 200 } as const;
export const SPACER_SIZES = { sm: 12, md: 24, lg: 40 } as const;
const ALIGNS = ["left", "center", "right"] as const;

type ColorName = keyof typeof RICH_COLORS;
type Align = (typeof ALIGNS)[number];

const MAX_NODES = 6000;
const URL_OK = /^(https?:\/\/|mailto:)[^\s"'<>]{1,490}$/i;
const IMG_OK = /^https:\/\/[^\s"'<>]{1,490}$/i;

export const isRichDoc = (body: string) => body.trimStart().startsWith('{"type":"doc"');

const nameOf = <T extends Record<string, string>>(table: T, value: unknown): keyof T | null => {
  if (typeof value !== "string") return null;
  const v = value.toLowerCase();
  for (const [k, hex] of Object.entries(table)) if (k === v || hex.toLowerCase() === v) return k as keyof T;
  return null;
};
const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Keeps only known nodes, marks and values; returns null when nothing usable is left. */
export function sanitizeDoc(raw: unknown): RichDoc | null {
  let budget = MAX_NODES;
  const marks = (list: unknown): RichMark[] | undefined => {
    if (!Array.isArray(list)) return undefined;
    const out: RichMark[] = [];
    for (const m of list as RichMark[]) {
      if (!m || typeof m !== "object") continue;
      if (["bold", "italic", "underline", "strike"].includes(m.type)) out.push({ type: m.type });
      else if (m.type === "link") {
        const href = str(m.attrs?.href, 500).trim();
        if (URL_OK.test(href)) out.push({ type: "link", attrs: { href } });
      } else if (m.type === "textStyle") {
        const color = nameOf(RICH_COLORS, m.attrs?.color);
        const size = nameOf(RICH_SIZES, m.attrs?.fontSize);
        if (color || size) out.push({ type: "textStyle", attrs: { color: color ? RICH_COLORS[color] : null, fontSize: size ? RICH_SIZES[size] : null } });
      } else if (m.type === "highlight") {
        const color = nameOf(RICH_HIGHLIGHTS, m.attrs?.color) ?? "yellow";
        out.push({ type: "highlight", attrs: { color: RICH_HIGHLIGHTS[color] } });
      }
    }
    return out.length ? out : undefined;
  };
  const inline = (list: unknown): RichNode[] => {
    if (!Array.isArray(list)) return [];
    const out: RichNode[] = [];
    for (const n of list as RichNode[]) {
      if (--budget < 0 || !n || typeof n !== "object") break;
      if (n.type === "text" && typeof n.text === "string" && n.text) out.push({ type: "text", text: n.text.slice(0, 5000), ...(marks(n.marks) && { marks: marks(n.marks) }) });
      else if (n.type === "hardBreak") out.push({ type: "hardBreak" });
    }
    return out;
  };
  const align = (attrs: Record<string, unknown> | undefined) => ({ textAlign: ALIGNS.includes(attrs?.textAlign as Align) ? attrs!.textAlign : null });
  const blocks = (list: unknown, depth: number): RichNode[] => {
    if (!Array.isArray(list) || depth > 6) return [];
    const out: RichNode[] = [];
    for (const n of list as RichNode[]) {
      if (--budget < 0 || !n || typeof n !== "object") break;
      const node = block(n, depth);
      if (node) out.push(node);
    }
    return out;
  };
  const items = (list: unknown, depth: number): RichNode[] =>
    (Array.isArray(list) ? (list as RichNode[]) : [])
      .filter((n) => n?.type === "listItem")
      .map((n) => ({ type: "listItem", content: blocks(n.content, depth + 1).filter((b) => ["paragraph", "bulletList", "orderedList"].includes(b.type)) }))
      // An empty item (✓ or bullet with no text) is left out.
      .filter((n) => n.content.some((b) => b.type !== "paragraph" || b.content?.length));
  const block = (n: RichNode, depth: number): RichNode | null => {
    switch (n.type) {
      case "paragraph": {
        const content = inline(n.content);
        return { type: "paragraph", attrs: align(n.attrs), ...(content.length && { content }) };
      }
      case "heading": {
        const content = inline(n.content);
        if (!content.length) return null;
        return { type: "heading", attrs: { level: n.attrs?.level === 3 ? 3 : 2, ...align(n.attrs) }, content };
      }
      case "bulletList":
      case "orderedList": {
        const content = items(n.content, depth);
        if (!content.length) return null;
        return { type: n.type, attrs: n.type === "bulletList" ? { check: n.attrs?.check === true } : {}, content };
      }
      case "blockquote":
      case "box": {
        const content = blocks(n.content, depth + 1);
        if (!content.length) return null;
        return n.type === "box" ? { type: "box", attrs: { tone: nameOf(Object.fromEntries(Object.keys(BOX_TONES).map((k) => [k, k])), n.attrs?.tone) ?? "blue" }, content } : { type: "blockquote", content };
      }
      case "horizontalRule":
        return { type: "horizontalRule" };
      case "spacer":
        return { type: "spacer", attrs: { size: pick(Object.keys(SPACER_SIZES) as (keyof typeof SPACER_SIZES)[], n.attrs?.size, "md") } };
      case "image": {
        const src = str(n.attrs?.src, 500).trim();
        if (!IMG_OK.test(src)) return null;
        const href = str(n.attrs?.href, 500).trim();
        return {
          type: "image",
          attrs: {
            src, alt: str(n.attrs?.alt, 200), caption: str(n.attrs?.caption, 200),
            size: pick(Object.keys(IMAGE_SIZES) as (keyof typeof IMAGE_SIZES)[], n.attrs?.size, "full"),
            align: pick(ALIGNS, n.attrs?.align, "center"), href: URL_OK.test(href) ? href : "",
          },
        };
      }
      case "button": {
        const url = str(n.attrs?.url, 500).trim();
        const label = str(n.attrs?.label, 60).trim();
        if (!label || !URL_OK.test(url)) return null;
        return { type: "button", attrs: { label, url, color: pick(Object.keys(BUTTON_COLORS) as (keyof typeof BUTTON_COLORS)[], n.attrs?.color, "navy"), align: pick(ALIGNS, n.attrs?.align, "center") } };
      }
      default:
        return null;
    }
  };
  if (!raw || typeof raw !== "object" || (raw as RichNode).type !== "doc") return null;
  const content = blocks((raw as RichNode).content, 0);
  return content.length ? { type: "doc", content } : null;
}

/** Any stored body (rich JSON or the old text format) as a clean document. */
export function toDoc(body: string): RichDoc {
  if (isRichDoc(body)) {
    try {
      return sanitizeDoc(JSON.parse(body)) ?? { type: "doc", content: [] };
    } catch {
      return { type: "doc", content: [] };
    }
  }
  return markupToDoc(body);
}

/** What the server stores for a body sent by the editor (JSON, cleaned), or the text as it came for an old-format body. */
export function cleanBody(body: string): string {
  if (!isRichDoc(body)) return body;
  const doc = toDoc(body);
  return docIsEmpty(doc) ? "" : JSON.stringify(doc);
}

export const docIsEmpty = (doc: RichDoc) => !docText(doc).trim() && !doc.content.some((n) => ["image", "button"].includes(n.type));

// ---------------------------------------------------------------- rendering

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const ownSite = (url: string) => /^https:\/\/(www\.)?wsool\.link(\/|$)/.test(url) || url.startsWith("mailto:");

type Mode = "email" | "web";

function textHtml(n: RichNode, mode: Mode): string {
  if (n.type === "hardBreak") return "<br>";
  let html = esc(n.text ?? "");
  // Inner marks first, so the link wraps everything.
  const ms = n.marks ?? [];
  const has = (t: string) => ms.find((m) => m.type === t);
  if (has("bold")) html = `<strong>${html}</strong>`;
  if (has("italic")) html = `<em>${html}</em>`;
  if (has("underline")) html = `<u>${html}</u>`;
  if (has("strike")) html = `<s>${html}</s>`;
  const style = has("textStyle");
  if (style) {
    const color = nameOf(RICH_COLORS, style.attrs?.color);
    const size = nameOf(RICH_SIZES, style.attrs?.fontSize);
    if (mode === "web") {
      const cls = [color && `ac-c-${color}`, size && `ac-${size}`].filter(Boolean).join(" ");
      if (cls) html = `<span class="${cls}">${html}</span>`;
    } else {
      const css = [color && `color:${RICH_COLORS[color]};`, size && `font-size:${size === "small" ? 13 : 19}px;`].filter(Boolean).join("");
      if (css) html = `<span style="${css}">${html}</span>`;
    }
  }
  const hl = has("highlight");
  if (hl) {
    const name = nameOf(RICH_HIGHLIGHTS, hl.attrs?.color) ?? "yellow";
    html = mode === "web" ? `<mark class="ac-hl-${name}">${html}</mark>` : `<span style="background:${RICH_HIGHLIGHTS[name]};padding:0 2px;border-radius:3px;">${html}</span>`;
  }
  const link = has("link");
  if (link) {
    const href = esc(String(link.attrs?.href ?? ""));
    html = mode === "web"
      ? `<a href="${href}" class="ac-link"${ownSite(String(link.attrs?.href)) ? "" : ' target="_blank" rel="noopener nofollow"'}>${html}</a>`
      : `<a href="${href}" style="color:#0060E6;text-decoration:underline;">${html}</a>`;
  }
  return html;
}
const inlineHtml = (nodes: RichNode[] | undefined, mode: Mode) => (nodes ?? []).map((n) => textHtml(n, mode)).join("");
const alignOf = (n: RichNode): Align | null => (ALIGNS.includes(n.attrs?.textAlign as Align) ? (n.attrs!.textAlign as Align) : null);

/** Email HTML (inline styles, tables for boxes and buttons). `dir` decides which side quotes get their bar on. */
export function docToEmailHtml(doc: RichDoc, dir: "rtl" | "ltr" = "rtl"): string {
  const start = dir === "rtl" ? "right" : "left";
  const P = "font-size:15px;line-height:1.8;color:#021941;";
  const ta = (n: RichNode) => (alignOf(n) ? `text-align:${alignOf(n)};` : "");
  const listItems = (n: RichNode, check: boolean): string =>
    (n.content ?? []).map((li) => {
      const inner = (li.content ?? []).map((b) => (b.type === "paragraph" ? inlineHtml(b.content, "email") || "&nbsp;" : block(b))).join("<br>");
      return check
        ? `<li style="margin:0 0 6px;list-style:none;"><span style="color:#12805C;font-weight:700;">✓</span>&nbsp; ${inner}</li>`
        : `<li style="margin:0 0 4px;">${inner}</li>`;
    }).join("");
  const block = (n: RichNode): string => {
    switch (n.type) {
      case "paragraph":
        return `<p style="margin:0 0 14px;${P}${ta(n)}">${inlineHtml(n.content, "email") || "&nbsp;"}</p>`;
      case "heading":
        return n.attrs?.level === 3
          ? `<h3 style="margin:18px 0 8px;font-size:16px;font-weight:700;line-height:1.5;color:#021941;${ta(n)}">${inlineHtml(n.content, "email")}</h3>`
          : `<h2 style="margin:22px 0 10px;font-size:19px;font-weight:700;line-height:1.5;color:#021941;${ta(n)}">${inlineHtml(n.content, "email")}</h2>`;
      case "bulletList": {
        const check = n.attrs?.check === true;
        return `<ul style="margin:0 0 14px;${check ? "padding:0;" : `padding-${start}:22px;`}${P}">${listItems(n, check)}</ul>`;
      }
      case "orderedList":
        return `<ol style="margin:0 0 14px;padding-${start}:22px;${P}">${listItems(n, false)}</ol>`;
      case "blockquote":
        return `<blockquote style="margin:0 0 16px;padding:2px 14px;border-${start}:3px solid #0060E6;color:#56607A;">${(n.content ?? []).map(block).join("")}</blockquote>`;
      case "box": {
        const tone = BOX_TONES[(n.attrs?.tone as keyof typeof BOX_TONES) ?? "blue"] ?? BOX_TONES.blue;
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border-collapse:separate;"><tr><td style="background:${tone.bg};border:1px solid ${tone.border};border-radius:12px;padding:16px 18px 2px;">${(n.content ?? []).map(block).join("")}</td></tr></table>`;
      }
      case "horizontalRule":
        return `<hr style="border:0;border-top:1px solid #E3E8EE;margin:22px 0;">`;
      case "spacer": {
        const h = SPACER_SIZES[n.attrs?.size as keyof typeof SPACER_SIZES] ?? 24;
        return `<div style="height:${h}px;line-height:${h}px;font-size:1px;">&nbsp;</div>`;
      }
      case "image": {
        const a = n.attrs ?? {};
        const w = IMAGE_SIZES[a.size as keyof typeof IMAGE_SIZES] ?? 472;
        const img = `<img src="${esc(String(a.src))}" alt="${esc(String(a.alt ?? ""))}" width="${w}" style="display:inline-block;width:100%;max-width:${w}px;height:auto;border:0;border-radius:12px;">`;
        const linked = a.href ? `<a href="${esc(String(a.href))}">${img}</a>` : img;
        const caption = a.caption ? `<p style="margin:-8px 0 16px;font-size:13px;line-height:1.6;color:#56607A;text-align:${a.align};">${esc(String(a.caption))}</p>` : "";
        return `<p style="margin:0 0 16px;text-align:${a.align ?? "center"};">${linked}</p>${caption}`;
      }
      case "button": {
        const a = n.attrs ?? {};
        const bg = BUTTON_COLORS[a.color as keyof typeof BUTTON_COLORS] ?? BUTTON_COLORS.navy;
        const al = a.align === "center" ? "center" : a.align === "left" ? "left" : "right";
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;"><tr><td align="${al}"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:999px;background:${bg};"><a href="${esc(String(a.url))}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(String(a.label))}</a></td></tr></table></td></tr></table>`;
      }
      default:
        return "";
    }
  };
  return doc.content.map(block).join("\n");
}

/** Readable id for a heading (anchor links in the Academy's table of contents). */
export const headingId = (i: number) => `h-${i + 1}`;

/** Web HTML (Academy articles): classes styled in globals.css (`.ac-*`, dark mode included); big headings get ids. */
export function docToWebHtml(doc: RichDoc): string {
  let h = 0;
  const al = (n: RichNode) => (alignOf(n) ? ` style="text-align:${alignOf(n)}"` : "");
  const li = (n: RichNode) => (n.content ?? []).map((item) => `<li>${(item.content ?? []).map((b) => (b.type === "paragraph" ? inlineHtml(b.content, "web") : block(b))).join("<br>")}</li>`).join("");
  const block = (n: RichNode): string => {
    switch (n.type) {
      case "paragraph":
        return `<p class="ac-p"${al(n)}>${inlineHtml(n.content, "web") || "<br>"}</p>`;
      case "heading":
        return n.attrs?.level === 3
          ? `<h3 class="ac-h3"${al(n)}>${inlineHtml(n.content, "web")}</h3>`
          : `<h2 id="${headingId(h++)}" class="ac-h2"${al(n)}>${inlineHtml(n.content, "web")}</h2>`;
      case "bulletList":
        return `<ul class="${n.attrs?.check ? "ac-check" : "ac-ul"}">${li(n)}</ul>`;
      case "orderedList":
        return `<ol class="ac-ol">${li(n)}</ol>`;
      case "blockquote":
        return `<blockquote class="ac-quote">${(n.content ?? []).map(block).join("")}</blockquote>`;
      case "box":
        return `<div class="ac-box ac-box-${esc(String(n.attrs?.tone ?? "blue"))}">${(n.content ?? []).map(block).join("")}</div>`;
      case "horizontalRule":
        return `<hr class="ac-hr">`;
      case "spacer":
        return `<div class="ac-space-${esc(String(n.attrs?.size ?? "md"))}" aria-hidden="true"></div>`;
      case "image": {
        const a = n.attrs ?? {};
        const img = `<img src="${esc(String(a.src))}" alt="${esc(String(a.alt ?? ""))}" loading="lazy" decoding="async">`;
        const linked = a.href ? `<a href="${esc(String(a.href))}"${ownSite(String(a.href)) ? "" : ' target="_blank" rel="noopener nofollow"'}>${img}</a>` : img;
        return `<figure class="ac-figure ac-img-${esc(String(a.size ?? "full"))} ac-align-${esc(String(a.align ?? "center"))}">${linked}${a.caption ? `<figcaption>${esc(String(a.caption))}</figcaption>` : ""}</figure>`;
      }
      case "button": {
        const a = n.attrs ?? {};
        const url = String(a.url);
        return `<p class="ac-btn-row ac-align-${esc(String(a.align ?? "center"))}"><a href="${esc(url)}" class="ac-btn ac-btn-${esc(String(a.color ?? "navy"))}"${ownSite(url) ? "" : ' target="_blank" rel="noopener nofollow"'}>${esc(String(a.label))}</a></p>`;
      }
      default:
        return "";
    }
  };
  return doc.content.map(block).join("\n");
}

const inlineText = (nodes: RichNode[] | undefined) => (nodes ?? []).map((n) => (n.type === "hardBreak" ? "\n" : n.text ?? "")).join("");

/** The big (level 2) headings in order: the article's "In this article" list. */
export function docHeadings(doc: RichDoc): { id: string; text: string }[] {
  return doc.content.filter((n) => n.type === "heading" && n.attrs?.level !== 3).map((n, i) => ({ id: headingId(i), text: inlineText(n.content) }));
}

/** Plain text (email text part, inbox preview, reading time). */
export function docText(doc: RichDoc): string {
  const out: string[] = [];
  const walk = (n: RichNode, prefix = "") => {
    switch (n.type) {
      case "paragraph": case "heading": out.push(prefix + inlineText(n.content)); break;
      case "bulletList": case "orderedList": {
        // One entry per list, a line per item.
        const lines = (n.content ?? []).map((item, i) => (n.type === "orderedList" ? `${i + 1}. ` : n.attrs?.check ? "✓ " : "- ") +
          (item.content ?? []).filter((b) => b.type === "paragraph").map((b) => inlineText(b.content)).join(" "));
        out.push(prefix + lines.join("\n"));
        break;
      }
      case "blockquote": case "box": (n.content ?? []).forEach((b) => walk(b)); break;
      case "horizontalRule": out.push("—"); break;
      case "image": if (n.attrs?.caption || n.attrs?.alt) out.push(`[${n.attrs.caption || n.attrs.alt}]`); break;
      case "button": out.push(`${n.attrs?.label}: ${n.attrs?.url}`); break;
    }
  };
  doc.content.forEach((n) => walk(n));
  return out.filter((l) => l.trim()).join("\n\n");
}

/** Shortcuts for any stored body. */
export const bodyToEmailHtml = (body: string, dir: "rtl" | "ltr" = "rtl") => docToEmailHtml(toDoc(body), dir);
export const bodyToWebHtml = (body: string) => docToWebHtml(toDoc(body));
export const bodyHeadings = (body: string) => docHeadings(toDoc(body));
export const bodyToText = (body: string) => docText(toDoc(body));

export type { ColorName };
