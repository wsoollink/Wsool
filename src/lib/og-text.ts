import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as fontkit from "fontkit";

/**
 * Arabic-safe text for link preview images. The image renderer (next/og)
 * measures Arabic as unconnected letters, so words come out with broken
 * spacing. Here fontkit shapes the text properly and we draw it as SVG
 * outlines, laid out right-to-left with greedy line wrapping.
 */

type Weight = 400 | 700;
const FILES = {
  arabic: { 400: "ibm-plex-sans-arabic-arabic-400-normal.woff", 700: "ibm-plex-sans-arabic-arabic-700-normal.woff" },
  latin: { 400: "ibm-plex-sans-arabic-latin-400-normal.woff", 700: "ibm-plex-sans-arabic-latin-700-normal.woff" },
  /** Wide display font for big numbers (Latin only). */
  numbers: { 400: "unbounded-latin-700-normal.woff", 700: "unbounded-latin-700-normal.woff" },
} as const;

const cache = new Map<string, fontkit.Font>();
function font(script: "arabic" | "latin" | "numbers", weight: Weight): fontkit.Font {
  const file = FILES[script][weight];
  let f = cache.get(file);
  if (!f) {
    f = fontkit.create(readFileSync(join(process.cwd(), "assets/fonts", file))) as fontkit.Font;
    cache.set(file, f);
  }
  return f;
}

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
export const hasArabic = (text: string) => ARABIC.test(text);

type Word = { paths: { d: string; color?: string }[]; width: number };

/** Invisible direction marks and emoji variation selectors: dropped before shaping. */
const INVISIBLE = /[\u200e\u200f\u2066-\u2069\u202a-\u202e\ufe0f]/g;

/** Heart (❤) drawn as an outline, since the text fonts have no emoji. Absolute coordinates on a 24 grid. */
const HEART = "M12 20.5C12 20.5 2 14 2 8.5C2 5.4 4.4 3 7.4 3C9.3 3 11 4 12 5.6C13 4 14.7 3 16.6 3C19.6 3 22 5.4 22 8.5C22 14 12 20.5 12 20.5Z";
function heart(size: number, x: number) {
  const s = (size * 0.78) / 24;
  const d = HEART.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_m, a, b) => `${(x + Number(a) * s).toFixed(2)} ${(Number(b) * s - size * 0.74).toFixed(2)}`);
  return { d, width: size * 0.82 };
}

type Run = { text: string; font: fontkit.Font; rtl: boolean } | { heart: true };

/**
 * Splits a word into runs a font can draw: the Arabic subset font has no
 * Latin punctuation (".", ":"), so those fall back to the Latin font.
 */
function runs(word: string, primary: fontkit.Font, rtl: boolean): Run[] {
  const out: Run[] = [];
  for (const ch of word.replace(INVISIBLE, "")) {
    if (ch === "\u2764") { out.push({ heart: true }); continue; }
    const cp = ch.codePointAt(0)!;
    const f = primary.hasGlyphForCodePoint(cp) ? primary : [font("latin", 400), font("arabic", 400)].find((x) => x.hasGlyphForCodePoint(cp));
    if (!f) continue;
    const last = out[out.length - 1];
    if (last && "text" in last && last.font === f) last.text += ch;
    else out.push({ text: ch, font: f, rtl: f === primary ? rtl : false });
  }
  // Right-to-left words: runs go from right to left.
  return rtl ? out.reverse() : out;
}

/** Shapes one word and returns its outlines (origin at its left edge, baseline 0). */
function shapeWord(word: string, size: number, weight: Weight, numbers = false): Word {
  const arabic = hasArabic(word);
  const primary = font(arabic ? "arabic" : numbers ? "numbers" : "latin", weight);
  let x = 0;
  const paths: Word["paths"] = [];
  for (const run of runs(word, primary, arabic)) {
    if ("heart" in run) {
      const h = heart(size, x);
      paths.push({ d: h.d, color: "#e5484d" });
      x += h.width;
      continue;
    }
    // Fallback runs use the same weight in their own family.
    const f = run.font === primary ? primary : font(run.font === font("arabic", 400) ? "arabic" : "latin", weight);
    const layout = f.layout(run.text, undefined, run.rtl ? "arab" : "latn", undefined, run.rtl ? "rtl" : "ltr");
    const scale = size / f.unitsPerEm;
    layout.glyphs.forEach((glyph, i) => {
      const pos = layout.positions[i];
      const d = glyph.path.scale(scale, -scale).translate(x + pos.xOffset * scale, -pos.yOffset * scale).toSVG();
      if (d) paths.push({ d });
      x += pos.xAdvance * scale;
    });
  }
  return { paths, width: x };
}

type Options = {
  text: string;
  size: number;
  color: string;
  weight?: Weight;
  rtl: boolean;
  maxWidth: number;
  maxLines?: number;
  lineHeight?: number;
  /** Latin text in the wide numbers font. */
  numbers?: boolean;
};

export type TextPath = { d: string; x: number; y: number; color?: string };

/**
 * Shapes and wraps text; returns glyph outlines (SVG path data, y down) with
 * their offsets inside a width × height box. Used for OG images and PDFs.
 */
export function textPaths({ text, size, weight = 400, rtl, maxWidth, maxLines = 2, lineHeight = 1.35, numbers = false }: Omit<Options, "color">) {
  const space = font("latin", weight).layout(" ").advanceWidth * (size / 1000);
  const words = text.split(/\s+/).filter(Boolean).map((w) => shapeWord(w, size, weight, numbers));

  // Greedy wrapping in reading order.
  const lines: Word[][] = [[]];
  let lineWidth = 0;
  for (const word of words) {
    const current = lines[lines.length - 1];
    const needed = (current.length ? space : 0) + word.width;
    if (current.length && lineWidth + needed > maxWidth) {
      if (lines.length === maxLines) break;
      lines.push([word]);
      lineWidth = word.width;
    } else {
      current.push(word);
      lineWidth += needed;
    }
  }

  const lineBox = size * lineHeight;
  const baseline = size * 1.02;
  const widths = lines.map((line) => line.reduce((w, word, i) => w + word.width + (i ? space : 0), 0));
  const width = Math.ceil(Math.min(maxWidth, Math.max(...widths, 1)));
  const height = Math.ceil(lineBox * lines.length);

  const paths: TextPath[] = [];
  lines.forEach((line, row) => {
    // RTL: first word at the right edge; LTR: at the left edge.
    let x = rtl ? width : 0;
    for (const word of line) {
      const left = rtl ? x - word.width : x;
      for (const p of word.paths) paths.push({ d: p.d, x: left, y: row * lineBox + baseline, color: p.color });
      x = rtl ? left - space : left + word.width + space;
    }
  });
  return { paths, width, height, lines: lines.length };
}

/** Returns an SVG data URL plus its size, ready for an <img> in next/og. */
export function textImage(opts: Options) {
  const { paths, width, height } = textPaths(opts);
  const parts = paths.map((p) => `<path transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})" d="${p.d}"${p.color ? ` fill="${p.color}"` : ""}/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="${opts.color}">${parts.join("")}</svg>`;
  return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, width, height };
}
