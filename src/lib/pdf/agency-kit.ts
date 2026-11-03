import "server-only";
import {
  appendBezierCurve, clip, closePath, endPath, lineTo, moveTo, PDFDocument, PDFString, popGraphicsState, pushGraphicsState, rgb,
  LineCapStyle, type PDFImage, type PDFPage, type RGB,
} from "pdf-lib";
import QRCode from "qrcode";
import { createTranslator } from "use-intl/core";
import { agencyTheme } from "@/components/agency-page/theme";
import { PLATFORM_ICON_PATHS } from "@/components/creator/PlatformIcon";
import { PLATFORM_NAMES } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { toIntlLocale, type Locale } from "@/i18n/config";
import type { PublicAgency } from "@/lib/agency-page";
import { mix } from "@/lib/color";
import { fetchImage } from "@/lib/fetch-capped";
import { formatCompact, formatNumber, formatPhone } from "@/lib/format";
import { initials } from "@/lib/initials";
import { hasArabic, textPaths } from "@/lib/og-text";
import { siteOrigin } from "@/lib/site-url";
import { VERIFIED_BLUE, badgeShape } from "@/lib/verified-badge";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

/**
 * Agency profile PDF (/<slug>/pdf): cover in the hero colours (logo, name, tagline, numbers), about + contact,
 * the creators as a 3 × 3 card grid per page (each card links to the creator's page), and a closing contact page
 * with a QR code. Colours from the agency's template. Layout in A4 design px (794 × 1123) like the creator media kit.
 */
const PX = 0.75;
const PW = 794, PH = 1123;
const W = PW * PX, H = PH * PX;
const PAD = 56;
const CONTENT = PW - PAD * 2;

const CHECK = "M5 12l5 5 9-10";
const ICON = {
  mail: "M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z M4 7l8 6 8-6",
  globe: "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0 M3 12h18 M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M14.5 10a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0",
};

type Paint = { color: RGB; opacity: number };
function paint(value: string): Paint {
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (m) return { color: rgb(Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255), opacity: m[4] === undefined ? 1 : Number(m[4]) };
  const n = parseInt(value.slice(1, 7), 16);
  return { color: rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255), opacity: 1 };
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

async function loadImage(doc: PDFDocument, src: string | null): Promise<PDFImage | null> {
  if (!src) return null;
  try {
    const img = await fetchImage(new URL(src, siteOrigin()));
    if (!img) return null;
    let bytes = img.bytes;
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    const sharp = (await import("sharp").catch(() => null))?.default;
    if (!sharp) return null;
    bytes = await sharp(bytes).png().toBuffer();
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

type TextOpts = { size: number; weight?: 400 | 700; color: string; width: number; maxLines?: number; lineHeight?: number; numbers?: boolean; align?: "start" | "end" | "center" };

export async function buildAgencyKit(agency: PublicAgency, lang: Locale): Promise<Uint8Array> {
  const t = createTranslator({ locale: toIntlLocale(lang), messages: lang === "ar" ? ar : en, namespace: "AgencyPage" });
  const rtl = lang === "ar";
  const th = agencyTheme(agency.template, agency.accent);
  const origin = siteOrigin();
  const pageUrl = `${origin}/${agency.slug}`;
  const shortLink = `${origin.replace(/^https?:\/\//, "")}/${agency.slug}`;

  const doc = await PDFDocument.create();
  doc.setTitle(`${agency.name} — ${t("downloadPdf")}`);
  doc.setAuthor(agency.name);
  doc.setCreator("Wsool (wsool.link)");
  doc.setLanguage(lang);
  let pg!: PDFPage;

  // ---------- primitives (design px, origin top-left) ----------
  const fill = (d: string, value: string, opacity = 1) => {
    const p = paint(value);
    pg.drawSvgPath(d, { x: 0, y: H, scale: PX, color: p.color, opacity: p.opacity * opacity });
  };
  const box = (x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; r?: number }) => {
    const d = roundRect(x, y, w, h, o.r ?? 0);
    if (o.fill) fill(d, o.fill);
    if (o.stroke) {
      const s = paint(o.stroke);
      pg.drawSvgPath(d, { x: 0, y: H, scale: PX, borderColor: s.color, borderOpacity: s.opacity, borderWidth: 1 });
    }
  };
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
  const tick = (x: number, y: number, size: number) => {
    fill(badgeShape(x + size / 2, y + size / 2, size / 2), VERIFIED_BLUE);
    stroke(CHECK, x + size * 0.2, y + size * 0.2, size * 0.6, "#FFFFFF", 3.2);
  };
  const link = (x: number, y: number, w: number, h: number, url: string) => {
    const annot = doc.context.obj({
      Type: "Annot", Subtype: "Link", Rect: [x * PX, H - (y + h) * PX, (x + w) * PX, H - y * PX], Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    pg.node.addAnnot(doc.context.register(annot));
  };
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
  const image = (img: PDFImage, x: number, y: number, w: number, h: number, fit: "cover" | "contain", r = 0, focus = 0.3) => {
    const s = fit === "cover" ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    const ix = x + (w - iw) / 2, iy = y + (h - ih) * (fit === "cover" ? focus : 0.5);
    withClip(x, y, w, h, r, () => pg.drawImage(img, { x: ix * PX, y: H - (iy + ih) * PX, width: iw * PX, height: ih * PX }));
  };
  const shape = (value: string, o: Omit<TextOpts, "color">) =>
    textPaths({ text: value, size: o.size, weight: o.weight ?? 400, rtl: hasArabic(value), maxWidth: o.width, maxLines: o.maxLines ?? 1, lineHeight: o.lineHeight, numbers: o.numbers });
  const alignX = (x: number, boxW: number, w: number, align: "start" | "end" | "center" = "start") =>
    align === "center" ? x + (boxW - w) / 2 : (align === "start") === rtl ? x + boxW - w : x;
  const text = (value: string, x: number, y: number, o: TextOpts) => {
    if (!value) return 0;
    const s = shape(value, o);
    const left = alignX(x, o.width, s.width, o.align);
    const p = paint(o.color);
    for (const g of s.paths) pg.drawSvgPath(g.d, { x: (left + g.x) * PX, y: H - (y + g.y) * PX, scale: PX, color: p.color, opacity: p.opacity });
    return s.height;
  };
  const measure = (value: string, o: Omit<TextOpts, "color">) => (value ? shape(value, o).width : 0);
  /** x of a w-wide item at the start (right in Arabic) of [x0, x0 + boxW], moving `offset` inwards. */
  const startX = (x0: number, boxW: number, w: number, offset = 0) => (rtl ? x0 + boxW - w - offset : x0 + offset);

  const background = (color = th.bg) => pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: paint(color).color });
  const glow = (cx: number, cy: number, r: number, color: string) => {
    for (let i = 14; i > 0; i--) circle(cx, cy, (r * i) / 14, color, 0.035);
  };
  let pageNo = 0;
  const footer = (ink: string) => {
    pageNo++;
    text(`${agency.name} · ${shortLink}`, PAD, PH - 50, { size: 11, color: ink, width: CONTENT - 60 });
    text(String(pageNo), PAD, PH - 50, { size: 11, color: ink, width: CONTENT, align: "end", numbers: true });
  };

  // ---------- data ----------
  const [logo, ...photos] = await Promise.all([loadImage(doc, agency.logoUrl), ...agency.creators.map((c) => loadImage(doc, c.photoUrl || null))]);
  const big = (v: string) => !hasArabic(v);

  // ================= 1) Cover =================
  pg = doc.addPage([W, H]);
  background(th.heroBg);
  glow(rtl ? 0 : PW, 0, 620, th.heroAccent);
  glow(rtl ? PW : 0, PH, 520, th.heroAccent);
  // Logo + kind
  let y = 96;
  const LOGO = 72;
  const lx = startX(PAD, CONTENT, LOGO);
  if (logo) {
    box(lx, y, LOGO, LOGO, { fill: "#FFFFFF", r: 16 });
    image(logo, lx + 6, y + 6, LOGO - 12, LOGO - 12, "contain", 10);
  } else {
    box(lx, y, LOGO, LOGO, { fill: th.heroAccent, r: 16 });
    text(initials(agency.name), lx, y + 18, { size: 26, weight: 700, color: th.heroOnAccent, width: LOGO, align: "center" });
  }
  const kind = agency.city ? `${t("kind")} · ${agency.city}` : t("kind");
  // The kind label sits next to the logo.
  text(kind, rtl ? PAD : PAD + LOGO + 20, y + 24, { size: 16, weight: 700, color: th.heroAccent, width: CONTENT - LOGO - 20 });
  y += LOGO + 150;
  y += text(agency.name, PAD, y, { size: 64, weight: 700, color: th.heroInk, width: CONTENT, maxLines: 2, lineHeight: 1.2 }) + 20;
  if (agency.tagline) y += text(agency.tagline, PAD, y, { size: 22, color: th.heroMuted, width: CONTENT * 0.85, maxLines: 3, lineHeight: 1.6 }) + 10;

  // Creator photo strip
  const faces = agency.creators.map((c, i) => ({ c, img: photos[i] })).filter((f) => f.img).slice(0, 5);
  if (faces.length) {
    const fy = 640, fw = (CONTENT - 16 * 4) / 5, fh = fw * 1.3;
    faces.forEach((f, i) => {
      const fx = startX(PAD, CONTENT, fw, i * (fw + 16));
      image(f.img!, fx, fy + (i % 2) * 18, fw, fh, "cover", 18);
    });
  }
  // Numbers
  const stats = [
    { v: formatNumber(agency.stats.creators, lang), l: t("stat.creators") },
    { v: formatCompact(agency.stats.followers, lang), l: t("stat.followers") },
    { v: formatNumber(agency.stats.verified, lang), l: t("stat.verified") },
  ];
  const sy = 905, sw = (CONTENT - 32) / 3;
  stats.forEach((s, i) => {
    const sx = startX(PAD, CONTENT, sw, i * (sw + 16));
    box(sx, sy, sw, 110, { fill: mix(th.heroInk, th.heroBg, 0.92), stroke: mix(th.heroInk, th.heroBg, 0.8), r: 18 });
    text(s.v, sx + 20, sy + 18, { size: big(s.v) ? 34 : 28, weight: 700, color: th.heroInk, width: sw - 40, numbers: big(s.v) });
    text(s.l, sx + 20, sy + 70, { size: 14, color: th.heroMuted, width: sw - 40 });
  });
  text(shortLink, PAD, PH - 58, { size: 15, weight: 700, color: th.heroInk, width: CONTENT, align: "start" });
  link(PAD, PH - 64, CONTENT, 30, pageUrl);

  // ================= 2) About + contact =================
  const contacts = [
    agency.whatsapp && { icon: "whatsapp" as const, label: t("whatsapp"), value: formatPhone(agency.whatsapp), url: `https://wa.me/${agency.whatsapp}?text=${encodeURIComponent(t("whatsappMessage", { link: shortLink }))}` },
    agency.email && { icon: ICON.mail, label: t("email"), value: agency.email, url: `mailto:${agency.email}` },
    agency.website && { icon: ICON.globe, label: t("website"), value: agency.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), url: agency.website },
  ].filter((x): x is { icon: "whatsapp" | string; label: string; value: string; url: string } => !!x);

  const sectionHead = (eyebrow: string, title: string, top = 90) => {
    text(eyebrow, PAD, top, { size: 13, weight: 700, color: th.accent, width: CONTENT });
    return top + 28 + text(title, PAD, top + 28, { size: 36, weight: 700, color: th.ink, width: CONTENT, maxLines: 2, lineHeight: 1.25 });
  };

  if (agency.bio || contacts.length || agency.stats.platforms.length) {
    pg = doc.addPage([W, H]);
    background();
    y = sectionHead(t("aboutEyebrow"), t("aboutTitle")) + 26;
    if (agency.bio) {
      for (const para of agency.bio.split(/\n+/)) {
        y += text(para, PAD, y, { size: 17, color: th.muted, width: CONTENT, maxLines: 12, lineHeight: 1.9 }) + 12;
      }
      y += 20;
    }
    // Facts
    const facts = [
      agency.city && [t("facts.city"), agency.city],
      [t("facts.creators"), formatNumber(agency.stats.creators, lang)],
      agency.stats.platforms.length > 0 && [t("facts.platforms"), agency.stats.platforms.map((p) => PLATFORM_NAMES[p]).join(", ")],
    ].filter((x): x is string[] => !!x);
    const fh = facts.length * 58 + 16;
    box(PAD, y, CONTENT, fh, { fill: th.surface, stroke: th.line, r: 20 });
    facts.forEach(([k, v], i) => {
      const ry = y + 8 + i * 58;
      if (i) pg.drawLine({ start: { x: (PAD + 24) * PX, y: H - ry * PX }, end: { x: (PAD + CONTENT - 24) * PX, y: H - ry * PX }, thickness: PX, color: paint(th.line).color });
      text(k, PAD + 24, ry + 18, { size: 14, color: th.muted, width: 200 * 1, align: "start" });
      // Value in the end part of the row, clear of the label.
      text(v, rtl ? PAD + 24 : PAD + 24 + 160, ry + 17, { size: 15, weight: 700, color: th.ink, width: CONTENT - 48 - 160, align: "end" });
    });
    y += fh + 30;
    // Contact cards
    if (contacts.length) {
      const cw = (CONTENT - 16 * (contacts.length - 1)) / contacts.length;
      contacts.forEach((c, i) => {
        const cx = startX(PAD, CONTENT, cw, i * (cw + 16));
        box(cx, y, cw, 96, { fill: th.surface, stroke: th.line, r: 18 });
        const ix = startX(cx, cw, 22, 20);
        if (c.icon === "whatsapp") platformIcon("whatsapp", ix, y + 20, 22, "#25D366");
        else stroke(c.icon, ix, y + 20, 22, th.accent);
        text(c.label, cx + 20, y + 50, { size: 12, color: th.muted, width: cw - 40 });
        text(c.value, cx + 20, y + 66, { size: 14, weight: 700, color: th.ink, width: cw - 40 });
        link(cx, y, cw, 96, c.url);
      });
    }
    footer(th.muted);
  }

  // ================= 3) Creators (3 columns, as many rows as fit) =================
  const COLS = 3, GAP = 18;
  const cw = (CONTENT - GAP * (COLS - 1)) / COLS;
  const photoH = cw * 0.86, cardH = photoH + 96;
  const LIMIT = PH - 80;
  let idx = 0;
  while (idx < agency.creators.length) {
    pg = doc.addPage([W, H]);
    background();
    const top = idx === 0 ? sectionHead(t("rosterEyebrow"), t("rosterTitle", { name: agency.name })) + 30 : 90;
    const rows = Math.max(1, Math.floor((LIMIT - top + GAP) / (cardH + GAP)));
    for (let k = 0; k < rows * COLS && idx < agency.creators.length; k++, idx++) {
      const c = agency.creators[idx];
      const col = k % COLS, row = Math.floor(k / COLS);
      const x = startX(PAD, CONTENT, cw, col * (cw + GAP));
      const yy = top + row * (cardH + GAP);
      box(x, yy, cw, cardH, { fill: th.surface, stroke: th.line, r: 18 });
      const img = photos[idx];
      if (img) image(img, x + 8, yy + 8, cw - 16, photoH - 8, "cover", 12, 0.25);
      else {
        box(x + 8, yy + 8, cw - 16, photoH - 8, { fill: mix(th.accent, th.surface, 0.88), r: 12 });
        text(initials(c.name), x + 8, yy + photoH / 2 - 18, { size: 34, weight: 700, color: th.accent, width: cw - 16, align: "center" });
      }
      // Name, then the badge after it (left of it in Arabic).
      const ny = yy + photoH + 12;
      const nameBox = cw - 32 - (c.verified ? 22 : 0);
      const nameW = Math.min(measure(c.name, { size: 15, weight: 700, width: nameBox }), nameBox);
      text(c.name, rtl ? x + cw - 16 - nameBox : x + 16, ny, { size: 15, weight: 700, color: th.ink, width: nameBox });
      if (c.verified) tick(startX(x, cw, 16, 16 + nameW + 6), ny + 3, 16);
      if (c.specialty) text(c.specialty, x + 16, ny + 24, { size: 12, color: th.muted, width: cw - 32 });
      const fy = yy + cardH - 30;
      const num = c.followers !== null ? formatCompact(c.followers, lang) : t("private");
      text(num, rtl ? x + 16 + 84 : x + 16, fy - 4, { size: c.followers !== null ? 16 : 11, weight: 700, color: th.ink, width: cw - 32 - 84, numbers: c.followers !== null && big(num) });
      c.platforms.slice(0, 4).forEach((p, i) => platformIcon(p, rtl ? x + 16 + i * 20 : x + cw - 16 - 14 - i * 20, fy, 14, th.muted));
      link(x, yy, cw, cardH, `${origin}/${c.username}`);
    }
    footer(th.muted);
  }

  // ================= 4) Contact page =================
  pg = doc.addPage([W, H]);
  background(th.bandBg);
  glow(PW / 2, PH, 600, th.heroAccent);
  y = 300;
  y += text(t("bandTitle"), PAD, y, { size: 46, weight: 700, color: th.bandInk, width: CONTENT, align: "center", maxLines: 2, lineHeight: 1.25 }) + 16;
  y += text(t("bandSub", { name: agency.name }), PAD + 60, y, { size: 18, color: mix(th.bandInk, th.bandBg, 0.25), width: CONTENT - 120, align: "center", maxLines: 2, lineHeight: 1.7 }) + 40;
  const QR = 180;
  const qx = (PW - QR) / 2;
  box(qx, y, QR, QR, { fill: "#FFFFFF", r: 20 });
  const qr = QRCode.create(pageUrl, { errorCorrectionLevel: "M" });
  const cell = (QR - 28) / qr.modules.size;
  let qd = "";
  for (let r = 0; r < qr.modules.size; r++) {
    for (let c2 = 0; c2 < qr.modules.size; c2++) {
      if (qr.modules.get(r, c2)) qd += `M${qx + 14 + c2 * cell} ${y + 14 + r * cell}h${cell + 0.05}v${cell + 0.05}h${-(cell + 0.05)}Z`;
    }
  }
  fill(qd, "#0B1B33");
  link(qx, y, QR, QR, pageUrl);
  y += QR + 20;
  text(shortLink, PAD, y, { size: 20, weight: 700, color: th.bandInk, width: CONTENT, align: "center" });
  y += 60;
  // One centred row per channel: icon + value (labels left out: mixing Arabic and a number on one line flips them).
  contacts.forEach((c, i) => {
    const ly = y + i * 40;
    const vw = measure(c.value, { size: 16, weight: 700, width: CONTENT - 60 });
    const lx0 = (PW - (vw + 30)) / 2;
    if (c.icon === "whatsapp") platformIcon("whatsapp", lx0, ly, 20, "#25D366");
    else stroke(c.icon, lx0, ly, 20, th.bandInk);
    text(c.value, lx0 + 30, ly - 1, { size: 16, weight: 700, color: th.bandInk, width: vw + 2, align: "end" });
    link(lx0 - 6, ly - 6, vw + 42, 32, c.url);
  });
  text(t("madeWith"), PAD, PH - 56, { size: 11, color: mix(th.bandInk, th.bandBg, 0.45), width: CONTENT, align: "center" });

  return doc.save();
}
