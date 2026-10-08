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
} as const;

const cache = new Map<string, fontkit.Font>();
function font(script: "arabic" | "latin", weight: Weight): fontkit.Font {
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

type Word = { paths: string[]; width: number };

/** Shapes one word and returns its outlines (origin at its left edge, baseline 0). */
function shapeWord(word: string, size: number, weight: Weight): Word {
  const arabic = hasArabic(word);
  const f = font(arabic ? "arabic" : "latin", weight);
  const run = f.layout(word, undefined, arabic ? "arab" : "latn", undefined, arabic ? "rtl" : "ltr");
  const scale = size / f.unitsPerEm;
  let x = 0;
  const paths: string[] = [];
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const d = glyph.path
      .scale(scale, -scale)
      .translate(x + pos.xOffset * scale, -pos.yOffset * scale)
      .toSVG();
    if (d) paths.push(d);
    x += pos.xAdvance * scale;
  });
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
};

/** Returns an SVG data URL plus its size, ready for an <img> in next/og. */
export function textImage({ text, size, color, weight = 400, rtl, maxWidth, maxLines = 2, lineHeight = 1.35 }: Options) {
  const space = font("latin", weight).layout(" ").advanceWidth * (size / 1000);
  const words = text.split(/\s+/).filter(Boolean).map((w) => shapeWord(w, size, weight));

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

  const parts: string[] = [];
  lines.forEach((line, row) => {
    // RTL: first word at the right edge; LTR: at the left edge.
    let x = rtl ? width : 0;
    for (const word of line) {
      const left = rtl ? x - word.width : x;
      for (const d of word.paths) parts.push(`<path transform="translate(${left.toFixed(2)} ${(row * lineBox + baseline).toFixed(2)})" d="${d}"/>`);
      x = rtl ? left - space : left + word.width + space;
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="${color}">${parts.join("")}</svg>`;
  return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, width, height };
}
