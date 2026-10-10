import "server-only";
import { PDFDocument, rgb, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import { createTranslator } from "use-intl/core";
import { PLATFORM_ICON_PATHS } from "@/components/creator/PlatformIcon";
import { pageTheme } from "@/components/creator/theme";
import { PLATFORM_NAMES } from "@/config/platforms";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { mix } from "@/lib/color";
import { formatCompact, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { textPaths } from "@/lib/og-text";
import type { PublishedPage } from "@/lib/public-page";
import { bundleComparison, rateName } from "@/lib/rates";
import { siteOrigin } from "@/lib/site-url";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

/**
 * The PDF media kit (CLAUDE.md section 1): one A4 document in the creator's
 * template colors and page language. Text is shaped with fontkit and drawn as
 * outlines (same as link previews), so Arabic always joins correctly.
 */

const W = 595.28, H = 841.89, M = 36;
const CONTENT = W - M * 2;

/** "#rrggbb" or "rgba(r, g, b, a)" (blended onto `bg`) to a pdf-lib color. */
function color(value: string, bg: string): RGB {
  let hex = value;
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (m) {
    const solid = `#${[m[1], m[2], m[3]].map((c) => Number(c).toString(16).padStart(2, "0")).join("")}`;
    hex = mix(bg, solid, m[4] === undefined ? 1 : Number(m[4]));
  }
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function loadImage(doc: PDFDocument, src: string | null): Promise<PDFImage | null> {
  if (!src) return null;
  try {
    const res = await fetch(new URL(src, siteOrigin()));
    if (!res.ok) return null;
    let bytes = Buffer.from(await res.arrayBuffer());
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    // WebP/AVIF logos: convert to PNG when sharp is available, else skip.
    const sharp = (await import("sharp").catch(() => null))?.default;
    if (!sharp) return null;
    bytes = await sharp(bytes).png().toBuffer();
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

type TextOpts = { size: number; color: string; weight?: 400 | 700; width: number; maxLines?: number; numbers?: boolean; align?: "start" | "end" | "center" };

export async function buildMediaKit(page: PublishedPage, lang: Locale): Promise<Uint8Array> {
  const t = createTranslator({ locale: toIntlLocale(lang), messages: lang === "ar" ? ar : en, namespace: "CreatorPage" });
  const rtl = lang === "ar";
  const theme = pageTheme(page.template, page.accent, page.customColors);
  const bg = theme.bg;
  const surface = theme.solid;
  const C = { bg: color(bg, bg), surface: color(surface, bg), text: color(theme.text, bg), muted: color(theme.muted, bg), line: color(theme.line, bg), accent: color(theme.accent, bg), onAccent: color(theme.onAccent, bg) };
  // Big numbers always use the wide Black cut (the owner removed the choice).
  const numbersWide = true;
  const tr = page.translations.find((x) => x.lang === lang) ?? page.translations[0];

  const doc = await PDFDocument.create();
  doc.setTitle(`${tr?.fullName || page.username} — Media kit`);
  doc.setAuthor(tr?.fullName || page.username);
  doc.setCreator("Wsool (wsool.link)");
  doc.setLanguage(lang);

  const addPage = () => {
    const p = doc.addPage([W, H]);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
    return p;
  };
  let pdfPage: PDFPage = addPage();
  let top = M;
  const newPage = () => {
    pdfPage = addPage();
    top = M;
  };
  const ensure = (space: number) => { if (top + space > H - M - 24) newPage(); };
  /** x of a block of `w` points at the start (right in Arabic) of a `width` area that starts at `x0`. */
  const startX = (x0: number, width: number, w: number) => (rtl ? x0 + width - w : x0);

  /** Draws text with its top at `y`, inside [x0, x0 + width]; returns the height used. */
  const text = (value: string, x0: number, y: number, o: TextOpts, colorValue?: RGB) => {
    if (!value) return 0;
    const shaped = textPaths({ text: value, size: o.size, weight: o.weight ?? 400, rtl, maxWidth: o.width, maxLines: o.maxLines ?? 1, numbers: o.numbers });
    const left = o.align === "center" ? x0 + (o.width - shaped.width) / 2 : o.align === "end" ? (rtl ? x0 : x0 + o.width - shaped.width) : startX(x0, o.width, shaped.width);
    for (const p of shaped.paths) pdfPage.drawSvgPath(p.d, { x: left + p.x, y: H - (y + p.y), color: p.color ? color(p.color, bg) : (colorValue ?? color(o.color, bg)) });
    return shaped.height;
  };
  const card = (y: number, h: number, x0 = M, w = CONTENT) =>
    pdfPage.drawRectangle({ x: x0, y: H - y - h, width: w, height: h, color: C.surface, borderColor: C.line, borderWidth: 0.75, opacity: 1 });
  const heading = (label: string) => {
    ensure(40);
    top += text(label, M, top, { size: 13, weight: 700, color: theme.text, width: CONTENT }) + 8;
  };
  const icon = (platform: keyof typeof PLATFORM_ICON_PATHS, x: number, y: number, size: number, c: RGB) =>
    pdfPage.drawSvgPath(PLATFORM_ICON_PATHS[platform], { x, y: H - y, scale: size / 24, color: c });
  const check = (x: number, y: number, size: number) => {
    pdfPage.drawCircle({ x: x + size / 2, y: H - y - size / 2, size: size / 2, color: C.accent });
    pdfPage.drawSvgPath("M5 12.5l4.2 4.2L19 7", { x: x + size * 0.12, y: H - y - size * 0.1, scale: (size * 0.76) / 24, borderColor: C.onAccent, borderWidth: 2.4 });
  };

  // 0) The creator's own logo (optional), at the start of the page above the identity card.
  const logo = await loadImage(doc, page.logoUrl);
  if (logo) {
    const s = Math.min(160 / logo.width, 44 / logo.height);
    const w = logo.width * s, h = logo.height * s;
    pdfPage.drawImage(logo, { x: startX(M, CONTENT, w), y: H - top - h, width: w, height: h });
    top += h + 14;
  }

  // 1) Identity card: photo, name, specialty, location, bio.
  const photo = await loadImage(doc, page.photoUrl);
  const photoSize = 104;
  const textW = photo ? CONTENT - photoSize - 52 : CONTENT - 32;
  const textX = photo && !rtl ? M + 16 + photoSize + 20 : M + 16;
  const nameSize = 24;
  const anyVerified = page.accounts.some((a) => a.verified);
  const nameShaped = textPaths({ text: tr?.fullName || page.username, size: nameSize, weight: 700, rtl, maxWidth: textW - (anyVerified ? 26 : 0), maxLines: 2 });
  const location = [tr?.city, tr?.country].filter(Boolean).join(" · ");
  const bioLines = tr?.bio ? Math.min(6, textPaths({ text: tr.bio, size: 10.5, rtl, maxWidth: textW, maxLines: 6, lineHeight: 1.55 }).lines) : 0;
  const cardH = Math.max(photoSize + 32, 32 + nameShaped.height + (tr?.specialty ? 20 : 0) + (location ? 18 : 0) + bioLines * 16.3 + 6);
  card(top, cardH);
  if (photo) {
    const px = rtl ? M + CONTENT - 16 - photoSize : M + 16;
    const s = Math.max(photoSize / photo.width, photoSize / photo.height);
    pdfPage.drawImage(photo, { x: px + (photoSize - photo.width * s) / 2, y: H - top - 16 - photoSize + (photoSize - photo.height * s) / 2, width: photo.width * s, height: photo.height * s });
    // Round photo: cover the corners with the card color (square with a circular hole).
    if (page.photoShape === "circle") {
      const S = photoSize, r = S / 2;
      pdfPage.drawSvgPath(`M-1 -1 H${S + 1} V${S + 1} H-1 Z M${r} 0 A${r} ${r} 0 0 0 0 ${r} A${r} ${r} 0 0 0 ${r} ${S} A${r} ${r} 0 0 0 ${S} ${r} A${r} ${r} 0 0 0 ${r} 0 Z`, { x: px, y: H - top - 16, color: C.surface });
    }
    // Mask the overflow of non-square photos with the card color.
    if (photo.width !== photo.height) {
      const over = Math.abs(photo.width * s - photoSize) / 2;
      if (photo.width > photo.height) {
        pdfPage.drawRectangle({ x: px - over, y: H - top - 16 - photoSize, width: over, height: photoSize, color: C.surface });
        pdfPage.drawRectangle({ x: px + photoSize, y: H - top - 16 - photoSize, width: over, height: photoSize, color: C.surface });
      }
    }
  }
  let y = top + 16;
  {
    const left = startX(textX, textW - (anyVerified ? 26 : 0), nameShaped.width) + (rtl && anyVerified ? 26 : 0);
    for (const p of nameShaped.paths) pdfPage.drawSvgPath(p.d, { x: left + p.x, y: H - (y + p.y), color: C.text });
    if (anyVerified) check(rtl ? left - 24 : left + nameShaped.width + 6, y + 6, 18);
    y += nameShaped.height + 4;
  }
  if (tr?.specialty) y += text(tr.specialty, textX, y, { size: 12.5, weight: 700, color: theme.accent, width: textW }) + 4;
  if (location) y += text(location, textX, y, { size: 10.5, color: theme.muted, width: textW }) + 6;
  if (tr?.bio) text(tr.bio, textX, y, { size: 10.5, color: theme.text, width: textW, maxLines: 6 });
  top += cardH + 14;

  // 2) Headline numbers.
  const total = page.accounts.reduce((s, a) => s + a.followers, 0);
  const stats = [{ label: t("followersTotal"), value: formatNumber(total, lang) }];
  if (page.monthlyViews !== null) stats.push({ label: t("monthlyViews"), value: formatCompact(page.monthlyViews, lang) });
  const statW = (CONTENT - 12 * (stats.length - 1)) / stats.length;
  stats.forEach((s, i) => {
    const x0 = rtl ? M + CONTENT - (i + 1) * statW - i * 12 : M + i * (statW + 12);
    card(top, 70, x0, statW);
    text(s.value, x0 + 14, top + 12, { size: 24, weight: 700, color: theme.text, width: statW - 28, numbers: numbersWide && !/[؀-ۿ]/.test(s.value) });
    text(s.label, x0 + 14, top + 46, { size: 10, color: theme.muted, width: statW - 28 });
  });
  top += 70 + 18;

  // 3) Platforms.
  if (page.accounts.length) {
    heading(t("platforms"));
    const cols = 3, gap = 10, cw = (CONTENT - gap * (cols - 1)) / cols, ch = 64;
    page.accounts.forEach((a, i) => {
      if (i % cols === 0) { if (i) top += ch + gap; ensure(ch); }
      const col = i % cols;
      const x0 = rtl ? M + CONTENT - (col + 1) * cw - col * gap : M + col * (cw + gap);
      card(top, ch, x0, cw);
      const iconX = rtl ? x0 + cw - 12 - 16 : x0 + 12;
      icon(a.platform, iconX, top + 12, 16, C.text);
      if (a.verified) check(rtl ? x0 + 12 : x0 + cw - 12 - 14, top + 12, 14);
      text(formatCompact(a.followers, lang), x0 + 12, top + 32, { size: 15, weight: 700, color: theme.text, width: cw - 24, numbers: numbersWide && lang === "en" });
      const handle = textPaths({ text: `${PLATFORM_NAMES[a.platform]} @${a.handle}`, size: 8.5, rtl: false, maxWidth: cw - 24 - 22, maxLines: 1 });
      const hx = rtl ? x0 + cw - 12 - 22 - handle.width : x0 + 12 + 22;
      for (const p of handle.paths) pdfPage.drawSvgPath(p.d, { x: hx + p.x, y: H - (top + 14 + p.y), color: C.muted });
    });
    top += ch + 18;
  }

  // 4) Brands.
  if (page.brandLogos.length) {
    heading(t("brands"));
    const logos = await Promise.all(page.brandLogos.slice(0, 12).map(async (b) => ({ name: b.name, img: await loadImage(doc, b.logoUrl) })));
    const cols = 6, gap = 8, cw = (CONTENT - gap * (cols - 1)) / cols, ch = 40;
    logos.forEach((l, i) => {
      if (i % cols === 0) { if (i) top += ch + gap; ensure(ch); }
      const col = i % cols;
      const x0 = rtl ? M + CONTENT - (col + 1) * cw - col * gap : M + col * (cw + gap);
      pdfPage.drawRectangle({ x: x0, y: H - top - ch, width: cw, height: ch, color: rgb(1, 1, 1), borderColor: C.line, borderWidth: 0.75 });
      if (l.img) {
        const s = Math.min((cw - 12) / l.img.width, (ch - 10) / l.img.height);
        pdfPage.drawImage(l.img, { x: x0 + (cw - l.img.width * s) / 2, y: H - top - ch + (ch - l.img.height * s) / 2, width: l.img.width * s, height: l.img.height * s });
      } else {
        text(l.name, x0 + 4, top + 14, { size: 9, weight: 700, color: "#021941", width: cw - 8, align: "center" });
      }
    });
    top += ch + 18;
  }

  // 5) Ad rates (only if the creator shows them in the PDF).
  const settings = page.rateSettings;
  const withRates = page.accounts.filter((a) => a.rates.length);
  if (withRates.length || page.bundles.length) {
    heading(t("rates"));
    if (!settings.showInPdf) {
      ensure(40);
      card(top, 40);
      text(t("ratesOnRequest"), M + 16, top + 13, { size: 11, color: theme.muted, width: CONTENT - 32, align: "center" });
      top += 40 + 18;
    } else {
      const price = (v: number) => formatPrice(v, settings.currency, lang);
      const row = (label: string, value: string, note?: string) => {
        ensure(24);
        text(label, M + 16, top + 6, { size: 10.5, color: theme.text, width: CONTENT * 0.6 });
        text(value, M + 16, top + 5, { size: 11, weight: 700, color: theme.text, width: CONTENT - 32, align: "end" });
        if (note) text(note, M + 16, top + 19, { size: 8.5, color: theme.muted, width: CONTENT - 32, align: "end" });
        top += note ? 34 : 24;
        pdfPage.drawLine({ start: { x: M + 16, y: H - top + 4 }, end: { x: M + CONTENT - 16, y: H - top + 4 }, thickness: 0.5, color: C.line });
      };
      for (const a of withRates) {
        ensure(30);
        const iconX = rtl ? M + CONTENT - 16 - 14 : M + 16;
        icon(a.platform, iconX, top + 4, 14, C.text);
        const label = textPaths({ text: PLATFORM_NAMES[a.platform], size: 11, weight: 700, rtl: false, maxWidth: 200 });
        const lx = rtl ? iconX - 6 - label.width : iconX + 20;
        for (const p of label.paths) pdfPage.drawSvgPath(p.d, { x: lx + p.x, y: H - (top + 3 + p.y), color: C.text });
        top += 24;
        for (const r of a.rates) row(rateName(r, lang), price(r.price));
        top += 6;
      }
      for (const b of page.bundles) {
        const names = b.accountIds.map((id) => page.accounts.find((a) => a.id === id)).filter((a) => !!a).map((a) => PLATFORM_NAMES[a.platform]).join(" + ");
        ensure(30);
        top += text(`${t("bundle")}: ${rateName({ name: b.name ?? "", nameEn: b.nameEn }, lang) || names}`, M + 16, top + 2, { size: 11, weight: 700, color: theme.accent, width: CONTENT - 32 }) + 6;
        for (const r of b.rates) {
          const c = bundleComparison(r, b.accountIds, page.accounts);
          row(rateName(r, lang), price(r.price), c ? `${t("insteadOf", { price: price(c.separate) })} · ${t("save", { percent: formatPercent(c.savingsPercent, lang) })}` : undefined);
        }
        top += 6;
      }
      ensure(20);
      top += text(settings.vatIncluded ? t("vatIncluded") : t("vatExcluded"), M + 16, top, { size: 9, color: theme.muted, width: CONTENT - 32 }) + 16;
    }
  }

  // 5b) My services: name and price (or "on request"), description under it.
  if (page.services.length) {
    heading(t("services"));
    const pick = (ar: string, en: string | null) => (lang === "en" && en ? en : ar);
    for (const sv of page.services) {
      const description = pick(sv.description, sv.descriptionEn);
      const unit = pick(sv.unit, sv.unitEn);
      ensure(description ? 52 : 28);
      const price = sv.price === null ? t("onRequest") : `${formatPrice(sv.price, page.rateSettings.currency, lang)}${unit ? ` · ${unit}` : ""}`;
      text(pick(sv.name, sv.nameEn), M + 16, top + 6, { size: 10.5, weight: 700, color: theme.text, width: CONTENT * 0.55 });
      text(price, M + 16, top + 5, { size: 10.5, weight: 700, color: theme.text, width: CONTENT - 32, align: "end" });
      top += 22;
      if (description) top += text(description, M + 16, top, { size: 9, color: theme.muted, width: CONTENT - 32, maxLines: 2 }) + 6;
      pdfPage.drawLine({ start: { x: M + 16, y: H - top + 2 }, end: { x: M + CONTENT - 16, y: H - top + 2 }, thickness: 0.5, color: C.line });
      top += 6;
    }
    top += 12;
  }

  // 6) Contact + QR code to the live page.
  const link = `${siteOrigin().replace(/^https?:\/\//, "")}/${page.username}`;
  ensure(120);
  card(top, 110);
  const qr = QRCode.create(`${siteOrigin()}/${page.username}`, { errorCorrectionLevel: "M" });
  const qrSize = 86, cell = qrSize / qr.modules.size;
  const qrX = rtl ? M + 12 : M + CONTENT - 12 - qrSize;
  pdfPage.drawRectangle({ x: qrX - 4, y: H - top - 12 - qrSize - 4, width: qrSize + 8, height: qrSize + 8, color: rgb(1, 1, 1) });
  for (let r = 0; r < qr.modules.size; r++) {
    for (let c = 0; c < qr.modules.size; c++) {
      if (qr.modules.get(r, c)) pdfPage.drawRectangle({ x: qrX + c * cell, y: H - top - 12 - (r + 1) * cell, width: cell + 0.05, height: cell + 0.05, color: rgb(0.008, 0.098, 0.255) });
    }
  }
  const infoX = rtl ? M + qrSize + 32 : M + 16;
  const infoW = CONTENT - qrSize - 48;
  let cy = top + 14;
  cy += text(t("contact"), infoX, cy, { size: 13, weight: 700, color: theme.text, width: infoW }) + 8;
  const line = (label: string, value: string) => {
    const v = textPaths({ text: value, size: 10.5, rtl: false, maxWidth: infoW - 70, maxLines: 1 });
    text(label, infoX, cy, { size: 10, color: theme.muted, width: infoW });
    const vx = rtl ? infoX : infoX + infoW - v.width;
    for (const p of v.paths) pdfPage.drawSvgPath(p.d, { x: vx + p.x, y: H - (cy + p.y), color: C.text });
    cy += 20;
  };
  if (page.whatsapp) line(t("whatsapp"), `+${page.whatsapp}`);
  if (page.contactEmail) line(t("email"), page.contactEmail);
  line(t("page"), link);
  top += 110 + 14;

  // Footer on every page.
  for (const p of doc.getPages()) {
    pdfPage = p;
    if (page.showBranding) text(t.markup("madeWith", { b: (s) => s }), M, H - M + 6, { size: 9, color: theme.muted, width: CONTENT, align: "center" });
  }
  return doc.save();
}
