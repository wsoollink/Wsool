import "server-only";
import {
  appendBezierCurve, clip, closePath, degrees, endPath, lineTo, moveTo, PDFDocument, PDFString, popGraphicsState,
  pushGraphicsState, rgb, LineCapStyle, type PDFImage, type PDFPage, type RGB,
} from "pdf-lib";
import QRCode from "qrcode";
import { createTranslator } from "use-intl/core";
import { PLATFORM_ICON_PATHS } from "@/components/creator/PlatformIcon";
import { pageTheme } from "@/components/creator/theme";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { mix } from "@/lib/color";
import { currencyLabel, formatAmount, formatCompact, formatNumber, formatPercent, formatPhone } from "@/lib/format";
import { hasArabic, textPaths } from "@/lib/og-text";
import type { PublishedPage } from "@/lib/public-page";
import { bundleComparison, rateName } from "@/lib/rates";
import { siteOrigin } from "@/lib/site-url";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

/**
 * The PDF media kit, matching the owner's design ("لوحة التحكم" › ملف PDF):
 * A4 pages in the creator's template colors: cover, about, numbers, one page
 * per platform (audience + rates), bundle, services, brands, selected work and
 * contact. Sections without data are left out. Layout is written in the
 * design's CSS pixels (794 × 1123 per page) and scaled to points. Text is
 * shaped with fontkit and drawn as outlines, so Arabic always joins.
 */

const PX = 0.75; // design px → PDF pt
const PW = 794, PH = 1123; // page in design px
const W = PW * PX, H = PH * PX;
const PAD = 56; // side padding
const CONTENT = PW - PAD * 2;
const TOP = 40; // header top padding
const BODY = 135; // where page content starts under the header
const BOTTOM = PH - 76; // content must end above the footer

// ---------- colors ----------

type Paint = { color: RGB; opacity: number };

/** "#rrggbb" or "rgba(r, g, b, a)" → color + opacity (transparent → opacity 0). */
function paint(value: string): Paint {
  if (value === "transparent") return { color: rgb(0, 0, 0), opacity: 0 };
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (m) return { color: rgb(Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255), opacity: m[4] === undefined ? 1 : Number(m[4]) };
  const n = parseInt(value.slice(1, 7), 16);
  return { color: rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255), opacity: 1 };
}

// ---------- icons (24 × 24 grid, stroked) ----------

const ICONS = {
  external: "M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5",
  briefcase: "M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M14.5 10a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0",
  globe: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0 M3 12h18 M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z",
  mail: "M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z M4 7l8 6 8-6",
  check: "M5 12l5 5 9-10",
};

// ---------- images ----------

async function loadImage(doc: PDFDocument, src: string | null): Promise<PDFImage | null> {
  if (!src) return null;
  try {
    const res = await fetch(new URL(src, siteOrigin()));
    if (!res.ok) return null;
    let bytes = Buffer.from(await res.arrayBuffer());
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    // WebP/AVIF (brand logos): convert to PNG when sharp is available, else skip.
    const sharp = (await import("sharp").catch(() => null))?.default;
    if (!sharp) return null;
    bytes = await sharp(bytes).png().toBuffer();
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

/** Rounded rectangle as SVG path data (design px, y down). */
function roundRect(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

type Weight = 400 | 700;
type TextOpts = {
  size: number;
  weight?: Weight;
  color: string;
  /** Box width; text wraps or is cut to fit. */
  width: number;
  maxLines?: number;
  lineHeight?: number;
  /** Latin text in the wide Black numbers cut. */
  numbers?: boolean;
  align?: "start" | "end" | "center";
  opacity?: number;
};

export async function buildMediaKit(page: PublishedPage, lang: Locale): Promise<Uint8Array> {
  const t = createTranslator({ locale: toIntlLocale(lang), messages: lang === "ar" ? ar : en, namespace: "MediaKit" });
  const rtl = lang === "ar";
  const theme = pageTheme(page.template, page.accent, page.customColors);
  const P = {
    bg: theme.bg,
    ink: theme.text,
    muted: theme.muted,
    accent: theme.accent,
    onAccent: theme.onAccent,
    accent2: mix(theme.accent, theme.bg, 0.55),
    card: theme.surface,
    cardBorder: theme.line,
    soft: theme.soft,
    inverseBg: theme.text,
    inverseText: theme.bg,
    inverseMuted: mix(theme.bg, theme.text, 0.25),
    inverseSoft: mix(theme.text, theme.bg, 0.12),
    good: theme.dark ? "#4ADE80" : "#15803D",
    float: theme.dark ? 0.14 : 0.16,
  };
  const tr = page.translations.find((x) => x.lang === lang) ?? page.translations[0];
  const name = tr?.fullName || page.username;
  const origin = siteOrigin();
  const pageUrl = `${origin}/${page.username}`;
  const shortLink = `${origin.replace(/^https?:\/\//, "")}/${page.username}`;
  const intl = toIntlLocale(lang);
  const monthName = (iso: string | Date) => new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "Asia/Riyadh" }).format(new Date(iso));
  const kitMonth = (() => {
    const parts = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "Asia/Riyadh" }).formatToParts(new Date());
    const m = parts.find((x) => x.type === "month")!.value, y = parts.find((x) => x.type === "year")!.value;
    return `Media Kit - ${m.length > 3 || m === "May" ? m : `${m}.`} ${y}`;
  })();

  const doc = await PDFDocument.create();
  doc.setTitle(`${name} — Media kit`);
  doc.setAuthor(name);
  doc.setCreator("Wsool (wsool.link)");
  doc.setLanguage(lang);

  let pg!: PDFPage;

  // ---------- drawing primitives (design px, origin top-left) ----------

  const fill = (d: string, value: string, opacity = 1) => {
    const p = paint(value);
    if (!p.opacity) return;
    pg.drawSvgPath(d, { x: 0, y: H, scale: PX, color: p.color, opacity: p.opacity * opacity });
  };
  const box = (x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; r?: number }) => {
    const d = roundRect(x, y, w, h, o.r ?? 0);
    if (o.fill) fill(d, o.fill);
    if (o.stroke) {
      const s = paint(o.stroke);
      if (s.opacity) pg.drawSvgPath(d, { x: 0, y: H, scale: PX, borderColor: s.color, borderOpacity: s.opacity, borderWidth: 1 });
    }
  };
  const card = (x: number, y: number, w: number, h: number, r = 16) => box(x, y, w, h, { fill: P.card, stroke: P.cardBorder, r });
  const circle = (cx: number, cy: number, r: number, value: string, opacity = 1) =>
    fill(`M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`, value, opacity);
  const stroke = (icon: string, x: number, y: number, size: number, value: string, width = 1.8) => {
    const p = paint(value);
    pg.drawSvgPath(icon, { x: x * PX, y: H - y * PX, scale: (size / 24) * PX, borderColor: p.color, borderOpacity: p.opacity, borderWidth: width, borderLineCap: LineCapStyle.Round });
  };
  const platformIcon = (platform: Platform | "whatsapp", x: number, y: number, size: number, value: string) => {
    const p = paint(value);
    pg.drawSvgPath(PLATFORM_ICON_PATHS[platform], { x: x * PX, y: H - y * PX, scale: (size / 24) * PX, color: p.color, opacity: p.opacity });
  };
  /** Verified mark: accent circle with a check. */
  const tick = (x: number, y: number, size: number) => {
    circle(x + size / 2, y + size / 2, size / 2, P.accent);
    stroke(ICONS.check, x + size * 0.2, y + size * 0.2, size * 0.6, P.onAccent, 3.2);
  };
  /** Clickable area opening `url`. */
  const link = (x: number, y: number, w: number, h: number, url: string) => {
    const annot = doc.context.obj({
      Type: "Annot", Subtype: "Link", Rect: [x * PX, H - (y + h) * PX, (x + w) * PX, H - y * PX], Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    pg.node.addAnnot(doc.context.register(annot));
  };
  /** Clips the next drawing to a rounded rectangle (r = w/2 for a circle). */
  const withClip = (x: number, y: number, w: number, h: number, r: number, draw: () => void) => {
    const k = 0.5523 * r;
    const X = (v: number) => v * PX, Y = (v: number) => H - v * PX;
    pg.pushOperators(
      pushGraphicsState(),
      moveTo(X(x + r), Y(y)), lineTo(X(x + w - r), Y(y)),
      appendBezierCurve(X(x + w - r + k), Y(y), X(x + w), Y(y + r - k), X(x + w), Y(y + r)),
      lineTo(X(x + w), Y(y + h - r)),
      appendBezierCurve(X(x + w), Y(y + h - r + k), X(x + w - r + k), Y(y + h), X(x + w - r), Y(y + h)),
      lineTo(X(x + r), Y(y + h)),
      appendBezierCurve(X(x + r - k), Y(y + h), X(x), Y(y + h - r + k), X(x), Y(y + h - r)),
      lineTo(X(x), Y(y + r)),
      appendBezierCurve(X(x), Y(y + r - k), X(x + r - k), Y(y), X(x + r), Y(y)),
      closePath(), clip(), endPath(),
    );
    draw();
    pg.pushOperators(popGraphicsState());
  };
  /** Image fitted in a box: "cover" fills it (focus = vertical position 0-1), "contain" fits inside. */
  const image = (img: PDFImage, x: number, y: number, w: number, h: number, fit: "cover" | "contain", o: { r?: number; focus?: number; opacity?: number } = {}) => {
    const s = fit === "cover" ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    const ix = x + (w - iw) / 2, iy = y + (h - ih) * (fit === "cover" ? (o.focus ?? 0.5) : 0.5);
    const draw = () => pg.drawImage(img, { x: ix * PX, y: H - (iy + ih) * PX, width: iw * PX, height: ih * PX, opacity: o.opacity });
    if (fit === "cover" || o.r) withClip(x, y, w, h, o.r ?? 0, draw);
    else draw();
  };

  // ---------- text ----------

  const shape = (value: string, o: TextOpts) =>
    textPaths({ text: value, size: o.size, weight: o.weight ?? 400, rtl: hasArabic(value), maxWidth: o.width, maxLines: o.maxLines ?? 1, lineHeight: o.lineHeight, numbers: o.numbers });
  /** Left x of something `w` wide aligned in [x, x + boxW] (start = right in Arabic). */
  const alignX = (x: number, boxW: number, w: number, align: "start" | "end" | "center" = "start") =>
    align === "center" ? x + (boxW - w) / 2 : (align === "start") === rtl ? x + boxW - w : x;
  /** Draws text with its top at `y` in [x, x + width]; returns the height used. */
  const text = (value: string, x: number, y: number, o: TextOpts) => {
    if (!value) return 0;
    const s = shape(value, o);
    const left = alignX(x, o.width, s.width, o.align);
    const p = paint(o.color);
    for (const g of s.paths) {
      const c = g.color ? paint(g.color) : p;
      pg.drawSvgPath(g.d, { x: (left + g.x) * PX, y: H - (y + g.y) * PX, scale: PX, color: c.color, opacity: c.opacity * (o.opacity ?? 1) });
    }
    return s.height;
  };
  const measure = (value: string, o: Omit<TextOpts, "color">) => (value ? shape(value, { ...o, color: "#000" }) : { width: 0, height: 0, lines: 0 });
  /** Big numbers: the Black cut for Latin digits (Arabic compact words stay in the text font). */
  const isLatin = (v: string) => !hasArabic(v);

  // ---------- page frame ----------

  const background = () => {
    pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: paint(P.bg).color });
    const glow = paint(theme.glow);
    if (glow.opacity) {
      // Soft glows (CSS radial gradients) as stacked translucent circles.
      for (const [cx, cy, r] of [[PW, 0, 520], [0, PH, 560]] as const) {
        for (let i = 12; i > 0; i--) circle(cx, cy, (r * i) / 12, theme.glow, 1 / 12);
      }
    }
    if (paint(theme.grid).opacity) {
      const g = paint(theme.grid);
      for (let x = 32; x < PW; x += 32) pg.drawLine({ start: { x: x * PX, y: 0 }, end: { x: x * PX, y: H }, thickness: PX, color: g.color, opacity: g.opacity });
      for (let y = 32; y < PH; y += 32) pg.drawLine({ start: { x: 0, y: H - y * PX }, end: { x: W, y: H - y * PX }, thickness: PX, color: g.color, opacity: g.opacity });
    }
  };
  const addPage = () => {
    pg = doc.addPage([W, H]);
    background();
  };
  /** Header with the name and the kit month (pages after the cover). */
  const header = () => {
    text(name, PAD, TOP, { size: 13, weight: 700, color: P.ink, width: CONTENT });
    text(kitMonth, PAD, TOP + 1, { size: 12, color: P.muted, width: CONTENT, align: "end" });
  };

  // Flow: each section starts a page; long sections continue on new pages.
  let y = 0;
  const section = (title: string, subtitle?: string) => {
    addPage();
    header();
    y = BODY - 41;
    y += text(title, PAD, y, { size: 34, weight: 700, color: P.ink, width: CONTENT }) + 28;
    if (subtitle) y += text(subtitle, PAD, y - 16, { size: 16, color: P.muted, width: CONTENT, maxLines: 2 }) + 12;
  };
  const ensure = (h: number, title: string) => {
    if (y + h > BOTTOM) section(title);
  };

  // ---------- data ----------

  const accounts = page.accounts;
  const total = accounts.reduce((s, a) => s + a.followers, 0);
  const anyVerified = accounts.some((a) => a.verified);
  const settings = page.rateSettings;
  const currency = currencyLabel(settings.currency, lang);
  const lastUpdate = accounts.map((a) => a.followersUpdatedAt).filter((d): d is string => !!d).sort().pop() ?? null;
  const [photo, logo, brandImages, thumbs] = await Promise.all([
    loadImage(doc, page.photoUrl),
    loadImage(doc, page.logoUrl),
    Promise.all(page.brandLogos.slice(0, 20).map((b) => loadImage(doc, b.logoUrl))),
    Promise.all(page.portfolio.slice(0, 12).map((w) => loadImage(doc, w.thumbUrl))),
  ]);

  // ================= 1) Cover =================
  addPage();
  const circlePhoto = page.photoShape === "circle";
  let coverTop: number;
  if (photo && !circlePhoto) {
    // Full photo fading into the page (mask 55% → 100%).
    const HERO = 620;
    image(photo, 0, 0, PW, HERO, "cover", { focus: 0.18 });
    // Overlapping layers, each reaching the bottom, with opacities chosen so the
    // cover grows linearly (like the CSS mask). Few, clearly visible steps: very
    // faint layers get rounded away by PDF renderers.
    const from = HERO * 0.55, layers = 40;
    let covered = 0;
    for (let i = 0; i < layers; i++) {
      const target = (i + 1) / layers;
      const a = (target - covered) / (1 - covered);
      covered = target;
      const y0 = from + ((HERO - from) * i) / layers;
      fill(`M0 ${y0}H${PW}V${HERO}H0Z`, P.bg, Math.min(1, a));
    }
    fill(`M0 ${HERO}H${PW}V${PH}H0Z`, P.bg);
    // The grid shows through as the photo fades out (line opacity follows the fade).
    const g = paint(theme.grid);
    if (g.opacity) {
      const cover = (yy: number) => Math.max(0, Math.min(1, (yy - from) / (HERO - from)));
      for (let yy = 32; yy < PH; yy += 32) {
        const o = g.opacity * cover(yy);
        if (o > 0.002) pg.drawLine({ start: { x: 0, y: H - yy * PX }, end: { x: W, y: H - yy * PX }, thickness: PX, color: g.color, opacity: o });
      }
      for (let x = 32; x < PW; x += 32) {
        for (let yy = Math.floor(from / 16) * 16; yy < PH; yy += 16) {
          const o = g.opacity * cover(yy + 8);
          if (o > 0.002) pg.drawLine({ start: { x: x * PX, y: H - yy * PX }, end: { x: x * PX, y: H - (yy + 16) * PX }, thickness: PX, color: g.color, opacity: o });
        }
      }
    }
    coverTop = HERO - 130;
  } else if (photo) {
    const D = 300;
    circle(PW / 2, 90 + D / 2, D / 2 + 6, P.card);
    image(photo, (PW - D) / 2, 90, D, D, "cover", { r: D / 2, focus: 0.3 });
    coverTop = 90 + D + 20;
  } else {
    coverTop = 200;
  }
  // Pills: kit month (start) and the creator's logo, else "Wsool" (end).
  {
    const label = measure(kitMonth, { size: 13, weight: 700, width: 400 });
    const pw = label.width + 32 + 16;
    const px = alignX(48, PW - 96, pw, "start");
    box(px, 36, pw, 34, { fill: P.card, stroke: P.cardBorder, r: 17 });
    circle(rtl ? px + pw - 16 - 4 : px + 16 + 4, 53, 4, P.accent);
    text(kitMonth, rtl ? px + 16 : px + 32, 44, { size: 13, weight: 700, color: P.ink, width: label.width + 2 });
    if (logo) {
      const s = Math.min(170 / logo.width, 46 / logo.height);
      const lw = logo.width * s, lh = logo.height * s;
      image(logo, alignX(48, PW - 96, lw, "end"), 30, lw, lh, "contain");
    } else {
      const w = measure(t("wsool"), { size: 15, weight: 700, width: 200 }).width + 32;
      const bx = alignX(48, PW - 96, w, "end");
      box(bx, 36, w, 34, { fill: P.card, stroke: P.cardBorder, r: 17 });
      text(t("wsool"), bx + 16, 42, { size: 15, weight: 700, color: P.ink, width: w - 32 });
    }
  }
  // Floating brand logos at the sides of the cover text (as in the design).
  const floats = brandImages.filter((x): x is PDFImage => !!x);
  if (floats.length) {
    const spots: [number, number, number, number][] = [
      [40, 160, 64, 12], [104, 300, 46, -14], [26, 420, 70, 8], [118, 548, 44, -10],
      [44, 172, 56, -10], [126, 258, 38, 16], [20, 318, 70, 14], [100, 452, 46, -16], [30, 548, 56, 10],
    ];
    spots.forEach(([side, top, size, rot], i) => {
      const img = floats[i % floats.length];
      const fromRight = i < 4;
      const x = fromRight ? PW - side - size : side;
      const yy = coverTop + top;
      if (yy + size > PH - 20) return;
      const s = Math.min(size / img.width, size / img.height);
      pg.drawImage(img, { x: (x + (size - img.width * s) / 2) * PX, y: H - (yy + size) * PX, width: img.width * s * PX, height: img.height * s * PX, opacity: P.float, rotate: degrees(rot) });
    });
  }
  {
    // Three groups spread evenly between coverTop and the bottom bar.
    const nameSize = 54;
    const nameW = CONTENT - (anyVerified ? 42 : 0);
    const nameM = measure(name, { size: nameSize, weight: 700, width: nameW, maxLines: 2, lineHeight: 1.15 });
    const g1 = nameM.height + (tr?.specialty ? 8 + 30 : 0) + (tr?.city || tr?.country ? 8 + 22 : 0);
    const g2 = 22 + 2 + 80;
    const ctaH = 80;
    const avail = PH - 10 - 28 - coverTop;
    const gap = Math.max(16, (avail - g1 - g2 - ctaH) / 4);
    let cy = coverTop + gap;
    const nx = (PW - nameM.width - (anyVerified ? 42 : 0)) / 2;
    text(name, rtl ? nx + (anyVerified ? 42 : 0) : nx, cy, { size: nameSize, weight: 700, color: P.ink, width: nameM.width + 1, maxLines: 2, lineHeight: 1.15, align: "center" });
    if (anyVerified) tick(rtl ? nx : nx + nameM.width + 12, cy + nameM.height / 2 - 13, 30);
    cy += nameM.height;
    if (tr?.specialty) cy += 8 + text(tr.specialty, PAD, cy + 8, { size: 22, color: P.accent, width: CONTENT, align: "center" });
    const place = [tr?.city, tr?.country].filter(Boolean).join(t("listSep"));
    if (place) cy += 8 + text(place, PAD, cy + 8, { size: 15, color: P.muted, width: CONTENT, align: "center" });
    cy += gap;
    cy += text(t("followersAll"), PAD, cy, { size: 15, color: P.muted, width: CONTENT, align: "center" }) + 2;
    const totalText = formatNumber(total, lang);
    cy += text(totalText, PAD, cy, { size: 76, weight: 700, color: P.ink, width: CONTENT, align: "center", numbers: isLatin(totalText), lineHeight: 1.05 });
    cy += gap;
    // Call to action: open the full page.
    const linkM = measure(shortLink, { size: 20, weight: 700, width: 500 });
    const tapM = measure(t("tapToOpen"), { size: 13, width: 500 });
    const cw = 22 * 2 + 48 + 14 + Math.max(linkM.width, tapM.width);
    const cx = (PW - cw) / 2;
    card(cx, cy, cw, ctaH);
    const tileX = rtl ? cx + 22 : cx + 22;
    box(tileX, cy + 16, 48, 48, { fill: P.inverseBg, r: 12 });
    stroke(ICONS.external, tileX + 13, cy + 29, 22, P.inverseText, 2);
    const tx = cx + 22 + 48 + 14, tw = cw - 22 * 2 - 48 - 14;
    text(t("tapToOpen"), tx, cy + 17, { size: 13, color: P.muted, width: tw });
    text(shortLink, tx, cy + 38, { size: 20, weight: 700, color: P.ink, width: tw });
    link(cx, cy, cw, ctaH, pageUrl);
  }
  fill(`M0 ${PH - 10}H${PW}V${PH}H0Z`, P.ink);

  // ================= 2) About =================
  const about = tr?.bio || page.tags.length || page.licenses.length || tr?.city || tr?.country;
  if (about) {
    section(t("about"));
    if (tr?.bio) y += text(tr.bio, PAD, y, { size: 22, color: P.ink, width: CONTENT, maxLines: 7, lineHeight: 1.9 }) + 28;
    const tags = page.tags.filter((x) => x.lang === lang);
    const shownTags = tags.length ? tags : page.tags.filter((x) => x.lang === page.primaryLang);
    if (shownTags.length) {
      y += text(t("contentAreas"), PAD, y, { size: 14, weight: 700, color: P.muted, width: CONTENT }) + 12;
      let lineX = 0;
      for (const tag of shownTags) {
        const m = measure(tag.label, { size: 15, width: 400 });
        const w = m.width + 36;
        if (lineX && lineX + w > CONTENT) { y += 54; lineX = 0; }
        const x = rtl ? PAD + CONTENT - lineX - w : PAD + lineX;
        card(x, y, w, 46, 12);
        text(tag.label, x + 18, y + 12, { size: 15, color: P.ink, width: m.width + 1 });
        lineX += w + 10;
      }
      y += 46 + 28;
    }
    if (page.licenses.length) {
      y += text(t("licenses"), PAD, y, { size: 14, weight: 700, color: P.muted, width: CONTENT }) + 12;
      for (const l of page.licenses) {
        ensure(96, t("about"));
        card(PAD, y, CONTENT, 84);
        const tile = alignX(PAD + 20, CONTENT - 40, 48, "start");
        box(tile, y + 18, 48, 48, { fill: P.soft, r: 12 });
        stroke(l.verified ? ICONS.shield : ICONS.briefcase, tile + 12, y + 30, 24, P.ink);
        const tx = rtl ? PAD + 20 : PAD + 20 + 48 + 16, tw = CONTENT - 40 - 48 - 16;
        text(lang === "en" && l.nameEn ? l.nameEn : l.name, tx, y + 18, { size: 16, weight: 700, color: P.ink, width: tw });
        if (l.number) text(l.number, tx, y + 44, { size: 15, color: P.muted, width: tw });
        y += 84 + 12;
      }
      y += 16;
    }
    const place = [tr?.city, tr?.country].filter(Boolean).join(t("listSep"));
    const langs = [page.primaryLang, ...(page.enEnabled && page.primaryLang !== "en" ? (["en"] as const) : [])].map((l) => t(l === "ar" ? "langAr" : "langEn")).join(t("listSep"));
    const facts = [...(place ? [{ icon: ICONS.pin, label: t("city"), value: place }] : []), { icon: ICONS.globe, label: t("contentLanguage"), value: langs }];
    ensure(96, t("about"));
    const fw = (CONTENT - 12 * (facts.length - 1)) / facts.length;
    facts.forEach((f, i) => {
      const x = rtl ? PAD + CONTENT - (i + 1) * fw - i * 12 : PAD + i * (fw + 12);
      card(x, y, fw, 86);
      const tile = alignX(x + 20, fw - 40, 48, "start");
      box(tile, y + 19, 48, 48, { fill: P.soft, r: 12 });
      stroke(f.icon, tile + 12, y + 31, 24, P.ink);
      const tx = rtl ? x + 20 : x + 20 + 48 + 14, tw = fw - 40 - 48 - 14;
      text(f.label, tx, y + 19, { size: 13, color: P.muted, width: tw });
      text(f.value, tx, y + 42, { size: 17, weight: 700, color: P.ink, width: tw });
    });
    y += 86;
  }

  // ================= 3) Numbers =================
  if (accounts.length) {
    section(t("numbers"));
    const stats = [{ label: t("totalFollowers"), value: formatNumber(total, lang) }];
    if (page.monthlyViews !== null && page.monthlyViewsMonth) {
      stats.push({ label: t("viewsIn", { month: new Intl.DateTimeFormat(intl, { month: "long", timeZone: "UTC" }).format(new Date(page.monthlyViewsMonth)) }), value: formatCompact(page.monthlyViews, "en") });
    }
    const sw = (CONTENT - 14 * (stats.length - 1)) / stats.length;
    stats.forEach((s, i) => {
      const x = rtl ? PAD + CONTENT - (i + 1) * sw - i * 14 : PAD + i * (sw + 14);
      card(x, y, sw, 118);
      text(s.label, x + 22, y + 22, { size: 14, color: P.muted, width: sw - 44 });
      text(s.value, x + 22, y + 48, { size: 44, weight: 700, color: P.ink, width: sw - 44, numbers: isLatin(s.value), lineHeight: 1.1 });
    });
    y += 118 + 28;
    const cw = (CONTENT - 12) / 2, ch = 74;
    accounts.forEach((a, i) => {
      if (i % 2 === 0) { if (i) y += ch + 12; ensure(ch, t("numbers")); }
      const col = i % 2;
      const x = rtl ? PAD + CONTENT - (col + 1) * cw - col * 12 : PAD + col * (cw + 12);
      card(x, y, cw, ch);
      const tile = alignX(x + 16, cw - 32, 40, "start");
      box(tile, y + 17, 40, 40, { fill: P.soft, r: 10 });
      platformIcon(a.platform, tile + 10, y + 27, 20, P.ink);
      const arrowX = alignX(x + 16, cw - 32, 16, "end");
      stroke(ICONS.external, arrowX, y + 29, 16, P.muted, 2);
      const num = formatNumber(a.followers, lang);
      const numM = measure(num, { size: 22, weight: 700, width: 200, numbers: true });
      const numX = rtl ? arrowX + 16 + 12 : arrowX - 12 - numM.width;
      text(num, numX, y + 23, { size: 22, weight: 700, color: P.ink, width: numM.width + 1, numbers: true });
      const infoX = rtl ? numX + numM.width + 12 : tile + 40 + 12;
      const infoW = rtl ? tile - 12 - infoX : numX - 12 - infoX;
      const pname = PLATFORM_NAMES[a.platform];
      const pm = measure(pname, { size: 14, weight: 700, width: infoW });
      text(pname, infoX, y + 16, { size: 14, weight: 700, color: P.ink, width: infoW });
      if (a.verified) tick(rtl ? infoX + infoW - pm.width - 6 - 18 : infoX + pm.width + 6, y + 19, 18);
      text(`@${a.handle}`, infoX, y + 40, { size: 12, color: P.muted, width: infoW });
      link(x, y, cw, ch, a.url);
    });
    y += ch + 20;
    const note = [anyVerified ? t("verifiedNote") : null, lastUpdate ? t("updatedNote", { month: monthName(lastUpdate) }) : null, t("tapPlatform")].filter(Boolean).join(" · ");
    ensure(40, t("numbers"));
    const noteX = anyVerified ? (rtl ? PAD : PAD + 26) : PAD;
    if (anyVerified) tick(rtl ? PAD + CONTENT - 18 : PAD, y + 2, 18);
    text(note, noteX, y, { size: 13, color: P.muted, width: CONTENT - (anyVerified ? 26 : 0), maxLines: 2 });
  }

  // ================= 4) One page per platform =================
  const ratesShown = settings.showInPdf;
  const vatNote = settings.vatIncluded ? t("vatIncluded") : t("vatExcluded");
  type Share = { label: string; percent: number };
  const list = (v: unknown): Share[] => (Array.isArray(v) ? (v as Share[]).filter((s) => s && typeof s.percent === "number" && s.percent > 0) : []);
  // Shorter names the design uses for the most common countries.
  const SHORT: Record<string, { ar: string; en: string }> = { SA: { ar: "السعودية", en: "Saudi Arabia" }, AE: { ar: "الإمارات", en: "UAE" }, US: { ar: "أمريكا", en: "USA" }, GB: { ar: "بريطانيا", en: "UK" } };
  const countryName = (code: string) => {
    if (SHORT[code]) return SHORT[code][lang];
    try { return new Intl.DisplayNames([intl], { type: "region", style: "short" }).of(code) ?? code; } catch { return code; }
  };
  /** Rows of "label · bar · percent" (design: 64px | 1fr | 52px). */
  const bars = (rows: Share[], x: number, w: number, labelW: number) => {
    for (const r of rows) {
      const barW = w - labelW - 52 - 28;
      const labelX = alignX(x, w, labelW, "start");
      text(r.label, labelX, y, { size: 15, color: P.ink, width: labelW });
      const bx = rtl ? x + 52 + 14 : x + labelW + 14;
      box(bx, y + 9, barW, 10, { fill: P.soft, r: 5 });
      const fw = Math.max(10, (barW * Math.min(100, r.percent)) / 100);
      box(rtl ? bx + barW - fw : bx, y + 9, fw, 10, { fill: P.accent, r: 5 });
      text(formatPercent(r.percent, "en"), alignX(x, w, 52, "end"), y, { size: 15, color: P.muted, width: 52, align: rtl ? "start" : "end" });
      y += 28 + 12;
    }
    y -= 12;
  };
  for (const a of accounts) {
    const au = a.audience;
    const gender = list(au?.gender), ages = list(au?.ages), countries = list(au?.countries), cities = list(au?.cities);
    const hasAudience = gender.length + ages.length + countries.length + cities.length > 0;
    const hasRates = ratesShown && a.rates.length > 0;
    if (!hasAudience && !hasRates) continue;
    const pname = PLATFORM_NAMES[a.platform];
    section(pname);
    // Account card.
    y -= 6;
    card(PAD, y, CONTENT, 124);
    const tile = alignX(PAD + 20, CONTENT - 40, 88, "start");
    box(tile, y + 18, 88, 88, { fill: "#FFFFFF", stroke: "rgba(18,21,26,0.08)", r: 22 });
    platformIcon(a.platform, tile + 18, y + 36, 52, "#12151A");
    const unit = a.platform === "youtube" ? t("subscribers") : a.platform === "discord" ? t("members") : t("followers");
    const num = formatNumber(a.followers, lang);
    const numM = measure(num, { size: 34, weight: 700, width: 300, numbers: true });
    const endX = alignX(PAD + 20, CONTENT - 40, numM.width, "end");
    text(num, endX, y + 30, { size: 34, weight: 700, color: P.ink, width: numM.width + 1, numbers: true });
    text(unit, alignX(PAD + 20, CONTENT - 40, 120, "end"), y + 76, { size: 13, color: P.muted, width: 120, align: "end" });
    const infoX = rtl ? PAD + 20 + numM.width + 20 : tile + 88 + 18, infoW = CONTENT - 40 - 88 - 18 - numM.width - 20;
    const nm = measure(pname, { size: 24, weight: 700, width: infoW });
    text(pname, infoX, y + 20, { size: 24, weight: 700, color: P.ink, width: infoW });
    if (a.verified) tick(rtl ? infoX + infoW - nm.width - 8 - 22 : infoX + nm.width + 8, y + 27, 22);
    text(`@${a.handle}`, infoX, y + 56, { size: 15, color: P.muted, width: infoW });
    if (a.followersUpdatedAt) text(t("lastUpdated", { month: monthName(a.followersUpdatedAt) }), infoX, y + 82, { size: 13, color: P.muted, width: infoW });
    link(PAD, y, CONTENT, 124, a.url);
    y += 124 + 28;

    // Gender + cities (start column) and ages (end column).
    const left = [gender.length || cities.length, ages.length].filter(Boolean).length;
    if (left) {
      const colW = left === 2 ? (CONTENT - 14) / 2 : CONTENT;
      const rowsH = (n: number) => (n ? n * 28 + (n - 1) * 12 : 0);
      const genderH = gender.length ? 22 + 14 + 16 + 14 + 22 : 0;
      const citiesH = cities.length ? (gender.length ? 20 : 0) + 22 + 14 + rowsH(Math.min(5, cities.length)) : 0;
      const colAH = gender.length || cities.length ? 40 + genderH + citiesH : 0;
      const colBH = ages.length ? 40 + 22 + 12 + rowsH(ages.length) : 0;
      const h = Math.max(colAH, colBH);
      ensure(h, pname);
      const top = y;
      let col = 0;
      const colX = () => (rtl ? PAD + CONTENT - (col + 1) * colW - col * 14 : PAD + col * (colW + 14));
      if (gender.length || cities.length) {
        const x = colX();
        card(x, top, colW, h);
        y = top + 20;
        if (gender.length) {
          y += text(t("gender"), x + 20, y, { size: 16, weight: 700, color: P.ink, width: colW - 40 }) + 14;
          const male = gender.find((g) => g.label === "male")?.percent ?? 0;
          const female = gender.find((g) => g.label === "female")?.percent ?? 0;
          const sum = male + female || 1;
          const bw = colW - 40;
          withClip(x + 20, y, bw, 16, 8, () => {
            const mw = (bw * male) / sum;
            box(rtl ? x + 20 + bw - mw : x + 20, y, mw, 16, { fill: P.accent });
            box(rtl ? x + 20 : x + 20 + mw, y, bw - mw, 16, { fill: P.accent2 });
          });
          y += 16 + 14;
          const ml = `${t("male")} ${formatPercent(male, "en")}`, fl = `${t("female")} ${formatPercent(female, "en")}`;
          text(ml, x + 20, y, { size: 15, weight: 700, color: P.ink, width: bw });
          text(fl, x + 20, y, { size: 15, weight: 700, color: P.ink, width: bw, align: "end" });
          y += 22;
        }
        if (cities.length) {
          y += gender.length ? 20 : 0;
          y += text(t("cities"), x + 20, y, { size: 16, weight: 700, color: P.ink, width: colW - 40 }) + 14;
          bars(cities.slice(0, 5), x + 20, colW - 40, 64);
        }
        col++;
      }
      if (ages.length) {
        const x = colX();
        card(x, top, colW, h);
        y = top + 20;
        y += text(t("ages"), x + 20, y, { size: 16, weight: 700, color: P.ink, width: colW - 40 }) + 12;
        bars(ages.map((g) => ({ label: g.label.replace("-", "–"), percent: g.percent })), x + 20, colW - 40, 64);
      }
      y = top + h + 28;
    }
    if (countries.length) {
      const rows = countries.slice(0, 5);
      const h = 20 + 22 + 12 + rows.length * 28 + (rows.length - 1) * 12 + 20;
      ensure(h, pname);
      card(PAD, y, CONTENT, h);
      const top = y;
      y += 20;
      y += text(t("countries"), PAD + 20, y, { size: 16, weight: 700, color: P.ink, width: CONTENT - 40 }) + 12;
      bars(rows.map((c) => ({ label: countryName(c.label), percent: c.percent })), PAD + 20, CONTENT - 40, 170);
      y = top + h + 28;
    }
    if (hasRates) {
      const rows = Math.ceil(a.rates.length / 2);
      const h = 20 + 22 + 14 + rows * 58 + (rows - 1) * 12 + 20;
      ensure(h, pname);
      card(PAD, y, CONTENT, h);
      const top = y;
      text(t("ratesOn", { platform: pname }), PAD + 20, y + 20, { size: 16, weight: 700, color: P.ink, width: CONTENT - 40 });
      text(vatNote, PAD + 20, y + 23, { size: 12.5, color: P.muted, width: CONTENT - 40, align: "end" });
      const cw = (CONTENT - 40 - 12) / 2;
      a.rates.forEach((r, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = rtl ? PAD + 20 + CONTENT - 40 - (col + 1) * cw - col * 12 : PAD + 20 + col * (cw + 12);
        const ry = top + 20 + 22 + 14 + row * 70;
        box(x, ry, cw, 58, { fill: P.soft, r: 12 });
        const amount = formatAmount(r.price, lang);
        const am = measure(amount, { size: 24, weight: 700, width: 200, numbers: true });
        const cm = measure(currency, { size: 12.5, width: 100 });
        const priceW = am.width + 6 + cm.width;
        const px = alignX(x + 16, cw - 32, priceW, "end");
        text(amount, rtl ? px + cm.width + 6 : px, ry + 13, { size: 24, weight: 700, color: P.ink, width: am.width + 1, numbers: true });
        text(currency, rtl ? px : px + am.width + 6, ry + 23, { size: 12.5, color: P.muted, width: cm.width + 1 });
        text(rateName(r, lang), x + 16, ry + 17, { size: 15, color: P.ink, width: cw - 32 - priceW - 10 });
      });
      y = top + h + 28;
    }
  }

  // ================= 5) Bundle =================
  const bundle = ratesShown ? page.bundles[0] : undefined;
  const bundleAccounts = bundle ? bundle.accountIds.map((id) => accounts.find((a) => a.id === id)).filter((a) => !!a) : [];
  if (bundle && bundle.rates.length) {
    const title = rateName({ name: bundle.name ?? "", nameEn: bundle.nameEn }, lang) || t("bundle");
    section(title, t("bundleNote"));
    // Included platforms.
    const tiles = bundleAccounts.slice(0, 5);
    card(PAD, y, CONTENT, 192);
    text(t("included"), PAD, y + 28, { size: 14, weight: 700, color: P.muted, width: CONTENT, align: "center" });
    const rowW = tiles.length * 84 + (tiles.length - 1) * (18 + 18 + 18);
    let tx = rtl ? PAD + (CONTENT + rowW) / 2 - 84 : PAD + (CONTENT - rowW) / 2;
    tiles.forEach((a, i) => {
      box(tx, y + 66, 84, 84, { fill: "#FFFFFF", stroke: "rgba(18,21,26,0.08)", r: 22 });
      platformIcon(a.platform, tx + 18, y + 84, 48, "#12151A");
      text(PLATFORM_NAMES[a.platform], tx - 20, y + 158, { size: 14, weight: 700, color: P.ink, width: 124, align: "center" });
      if (i < tiles.length - 1) text("+", rtl ? tx - 18 - 18 : tx + 84 + 18, y + 90, { size: 28, color: P.muted, width: 18, align: "center" });
      tx += rtl ? -(84 + 54) : 84 + 54;
    });
    y += 192 + 28;
    for (const r of bundle.rates) {
      const c = bundleComparison(r, bundle.accountIds, accounts);
      const h = 24 + 66 + (c ? 30 : 0) + 24 - (c ? 20 : 0);
      ensure(h + 14, title);
      card(PAD, y, CONTENT, h);
      const amount = formatAmount(r.price, lang);
      const am = measure(amount, { size: 44, weight: 700, width: 300, numbers: true });
      const cm = measure(currency, { size: 15, width: 100 });
      const priceW = am.width + 8 + cm.width;
      const px = alignX(PAD + 24, CONTENT - 48, priceW, "end");
      text(amount, rtl ? px + cm.width + 8 : px, y + 22, { size: 44, weight: 700, color: P.ink, width: am.width + 1, numbers: true });
      text(currency, rtl ? px : px + am.width + 8, y + 44, { size: 15, color: P.muted, width: cm.width + 1 });
      const leftW = CONTENT - 48 - priceW - 16;
      text(rateName(r, lang), PAD + 24, y + 26, { size: 20, weight: 700, color: P.ink, width: leftW });
      if (c) {
        // "instead of ~~X~~ SAR separately" + savings pill.
        const pre = t("insteadOf"), was = formatAmount(c.separate, lang), post = t("separately", { currency });
        const preM = measure(pre, { size: 13.5, width: 200 }), wasM = measure(was, { size: 13.5, width: 200 }), postM = measure(post, { size: 13.5, width: 300 });
        let sx = rtl ? PAD + 24 + leftW : PAD + 24;
        const put = (s: string, m: { width: number }) => {
          const x = rtl ? sx - m.width : sx;
          text(s, x, y + 62, { size: 13.5, color: P.muted, width: m.width + 1 });
          sx = rtl ? x - 5 : x + m.width + 5;
          return x;
        };
        put(pre, preM);
        const wx = put(was, wasM);
        pg.drawLine({ start: { x: wx * PX, y: H - (y + 73) * PX }, end: { x: (wx + wasM.width) * PX, y: H - (y + 73) * PX }, thickness: PX, color: paint(P.muted).color });
        put(post, postM);
        const save = t("save", { percent: formatPercent(c.savingsPercent, "en") });
        const sm = measure(save, { size: 12.5, weight: 700, width: 200 });
        const pw = sm.width + 24;
        const pillX = alignX(PAD + 24, CONTENT - 48, pw, "end");
        box(pillX, y + 84, pw, 26, { fill: P.soft, r: 13 });
        text(save, pillX + 12, y + 89, { size: 12.5, weight: 700, color: P.good, width: sm.width + 1 });
      }
      y += h + 14;
    }
    text(settings.vatIncluded ? t("pricesVatIncluded") : t("pricesVatExcluded"), PAD, y + 6, { size: 13, color: P.muted, width: CONTENT });
  }

  // ================= 5b) Services =================
  if (page.services.length) {
    const title = t("services");
    section(title);
    const pick = (a: string, b: string | null) => (lang === "en" && b ? b : a);
    for (const sv of page.services) {
      const description = pick(sv.description, sv.descriptionEn);
      const unit = pick(sv.unit, sv.unitEn);
      const amount = sv.price === null ? null : formatAmount(sv.price, lang);
      const am = amount ? measure(amount, { size: 30, weight: 700, width: 300, numbers: true }) : measure(t("onRequest"), { size: 15, weight: 700, width: 300 });
      const tail = amount ? `${currency}${unit ? ` · ${unit}` : ""}` : "";
      const tm = measure(tail, { size: 13, width: 200 });
      const priceW = Math.max(am.width, tm.width);
      const leftW = CONTENT - 48 - priceW - 16;
      const dm = description ? measure(description, { size: 13.5, width: leftW, maxLines: 3, lineHeight: 1.6 }) : { height: 0 };
      const h = 24 + Math.max(28 + (description ? 8 + dm.height : 0), amount ? 40 + 20 : 24) + 24;
      ensure(h + 14, title);
      card(PAD, y, CONTENT, h);
      text(pick(sv.name, sv.nameEn), PAD + 24, y + 24, { size: 20, weight: 700, color: P.ink, width: leftW });
      if (description) text(description, PAD + 24, y + 60, { size: 13.5, color: P.muted, width: leftW, maxLines: 3, lineHeight: 1.6 });
      const px = alignX(PAD + 24, CONTENT - 48, priceW, "end");
      if (amount) {
        text(amount, px, y + 20, { size: 30, weight: 700, color: P.ink, width: priceW, numbers: true, align: "end" });
        text(tail, px, y + 62, { size: 13, color: P.muted, width: priceW, align: "end" });
      } else {
        text(t("onRequest"), px, y + 28, { size: 15, weight: 700, color: P.ink, width: priceW, align: "end" });
      }
      y += h + 14;
    }
  }

  // ================= 6) Brands =================
  if (page.brandLogos.length) {
    const title = t("brands");
    section(title, t("brandsCount", { count: page.brandLogos.length }));
    const cols = 5, gap = 10, tw = (CONTENT - gap * (cols - 1)) / cols, th = 64;
    page.brandLogos.slice(0, 20).forEach((b, i) => {
      if (i % cols === 0) { if (i) y += th + gap; ensure(th, title); }
      const col = i % cols;
      const x = rtl ? PAD + CONTENT - (col + 1) * tw - col * gap : PAD + col * (tw + gap);
      box(x, y, tw, th, { fill: "#FFFFFF", stroke: "rgba(18,21,26,0.08)", r: 12 });
      const img = brandImages[i];
      if (img) image(img, x + 16, y + 14, tw - 32, th - 28, "contain");
      else text(b.name ?? "", x + 8, y + 22, { size: 13, weight: 700, color: "#12151A", width: tw - 16, align: "center" });
    });
  }

  // ================= 7) Selected work =================
  if (page.portfolio.length) {
    const title = t("works");
    section(title);
    const cw = (CONTENT - 14) / 2, ch = 260;
    page.portfolio.slice(0, 12).forEach((w, i) => {
      if (i % 2 === 0) { if (i) y += ch + 14; ensure(ch, title); }
      const col = i % 2;
      const x = rtl ? PAD + CONTENT - (col + 1) * cw - col * 14 : PAD + col * (cw + 14);
      card(x, y, cw, ch);
      const thumbX = alignX(x + 12, cw - 24, 132, "start");
      const thumb = thumbs[i];
      if (thumb) image(thumb, thumbX, y + 12, 132, 236, "cover", { r: 12 });
      else box(thumbX, y + 12, 132, 236, { fill: "#141925", r: 12 });
      circle(thumbX + 66, y + 130, 22, "rgba(0,0,0,0.35)");
      fill(`M${thumbX + 60} ${y + 119}L${thumbX + 76} ${y + 130}L${thumbX + 60} ${y + 141}Z`, "#FFFFFF");
      const wt = w.translations.find((x) => x.lang === lang) ?? w.translations[0];
      const ix = rtl ? x + 12 : thumbX + 132 + 14, iw = cw - 24 - 132 - 14;
      let iy = y + 18;
      if (wt?.brand) iy += text(wt.brand, ix, iy, { size: 17, weight: 700, color: P.ink, width: iw }) + 6;
      if (wt?.type) iy += text(wt.type, ix, iy, { size: 14, color: P.muted, width: iw, maxLines: 2 }) + 6;
      if (w.platform) text(PLATFORM_NAMES[w.platform], ix, iy, { size: 13, color: P.muted, width: iw });
      const label = t("tapToWatch");
      const lm = measure(label, { size: 13, weight: 700, width: iw });
      const pw = lm.width + 28 + 20;
      const pillX = alignX(ix, iw, pw, "start");
      box(pillX, y + ch - 18 - 36, pw, 36, { fill: P.inverseBg, r: 18 });
      text(label, rtl ? pillX + pw - 14 - lm.width : pillX + 14, y + ch - 18 - 27, { size: 13, weight: 700, color: P.inverseText, width: lm.width + 1 });
      stroke(ICONS.external, rtl ? pillX + 12 : pillX + pw - 26, y + ch - 18 - 25, 14, P.inverseText, 2.2);
      link(x, y, cw, ch, w.videoUrl ? new URL(w.videoUrl, origin).toString() : pageUrl);
    });
  }

  // ================= 8) Contact =================
  {
    const title = t("contact");
    section(title);
    const intro = ratesShown || !(accounts.some((a) => a.rates.length) || page.bundles.length) ? t("contactIntro") : `${t("contactIntro")} ${t("ratesOnRequest")}`;
    y += text(intro, PAD, y - 10, { size: 20, color: P.muted, width: CONTENT, maxLines: 3, lineHeight: 1.8 }) + 18;
    const row = (label: string, value: string, url: string, icon: (x: number, yy: number) => void, size: number) => {
      card(PAD, y, CONTENT, 100);
      const tile = alignX(PAD + 22, CONTENT - 44, 56, "start");
      box(tile, y + 22, 56, 56, { fill: P.soft, r: 14 });
      icon(tile, y);
      const arrow = alignX(PAD + 22, CONTENT - 44, 20, "end");
      stroke(ICONS.external, arrow, y + 40, 20, P.muted, 2);
      const tx = rtl ? PAD + 22 + 20 + 18 : tile + 56 + 18, tw = CONTENT - 44 - 56 - 20 - 36;
      text(label, tx, y + 24, { size: 14, color: P.muted, width: tw });
      text(value, tx, y + 48, { size: size, weight: 700, color: P.ink, width: tw });
      link(PAD, y, CONTENT, 100, url);
      y += 100 + 28;
    };
    if (page.whatsapp) row(t("whatsapp"), formatPhone(page.whatsapp), `https://wa.me/${page.whatsapp}`, (x, yy) => platformIcon("whatsapp", x + 15, yy + 37, 26, P.ink), 24);
    if (page.contactEmail) row(t("email"), page.contactEmail, `mailto:${page.contactEmail}`, (x, yy) => stroke(ICONS.mail, x + 15, yy + 37, 26, P.ink), 22);
    // Full page (dark card) with a QR code for printed copies.
    y += 20;
    const h = 176;
    box(PAD, y, CONTENT, h, { fill: P.inverseBg, r: 16 });
    const tile = alignX(PAD + 32, CONTENT - 64, 96, "start");
    box(tile, y + 40, 96, 96, { fill: P.inverseSoft, r: 24 });
    stroke(ICONS.external, tile + 28, y + 68, 40, P.inverseText, 2);
    const qrSize = 112;
    const qrX = alignX(PAD + 32, CONTENT - 64, qrSize, "end");
    box(qrX, y + (h - qrSize) / 2, qrSize, qrSize, { fill: "#FFFFFF", r: 12 });
    const qr = QRCode.create(pageUrl, { errorCorrectionLevel: "M" });
    const inner = qrSize - 16, cell = inner / qr.modules.size;
    const qy = y + (h - qrSize) / 2 + 8;
    let qd = "";
    for (let r = 0; r < qr.modules.size; r++) {
      for (let c = 0; c < qr.modules.size; c++) {
        if (qr.modules.get(r, c)) qd += `M${qrX + 8 + c * cell} ${qy + r * cell}h${cell + 0.05}v${cell + 0.05}h${-(cell + 0.05)}Z`;
      }
    }
    fill(qd, "#021941");
    const tx = rtl ? qrX + qrSize + 28 : tile + 96 + 28, tw = CONTENT - 64 - 96 - qrSize - 56;
    let ty = y + 34;
    ty += text(t("fullPage"), tx, ty, { size: 24, weight: 700, color: P.inverseText, width: tw }) + 8;
    ty += text(t("fullPageNote"), tx, ty, { size: 15, color: P.inverseMuted, width: tw, maxLines: 2, lineHeight: 1.8 }) + 8;
    text(shortLink, tx, ty, { size: 22, weight: 700, color: P.inverseText, width: tw });
    link(PAD, y, CONTENT, h, pageUrl);
  }

  // ---------- footers (every page after the cover) ----------
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return;
    pg = p;
    const fy = PH - 32 - 16;
    text(shortLink, PAD, fy, { size: 11.5, color: P.muted, width: CONTENT });
    text(`${i + 1} / ${pages.length}`, PAD, fy, { size: 11.5, color: P.muted, width: CONTENT, align: "end" });
    if (page.showBranding) {
      const made = t("madeWith"), brand = t("wsool");
      const mm = measure(made, { size: 11.5, width: 200 }), bm = measure(brand, { size: 11.5, weight: 700, width: 200 });
      const total = mm.width + 4 + bm.width;
      const x = (PW - total) / 2;
      text(made, rtl ? x + bm.width + 4 : x, fy, { size: 11.5, color: P.muted, width: mm.width + 1 });
      text(brand, rtl ? x : x + mm.width + 4, fy, { size: 11.5, weight: 700, color: P.ink, width: bm.width + 1 });
    }
  });
  return doc.save();
}
