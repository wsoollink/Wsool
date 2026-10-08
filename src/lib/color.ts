/** Small color helpers for template palettes (hex in, hex out). */

type RGB = [number, number, number];

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function toRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Mix `a` toward `b` by `amount` (0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as RGB);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1 to 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.18;
}

/**
 * Contrast guard: nudge `color` toward black (on light backgrounds) or white
 * (on dark ones) until it reaches `min` contrast against `bg`.
 */
export function ensureContrast(color: string, bg: string, min = 4.5): string {
  const target = isDark(bg) ? "#ffffff" : "#000000";
  let out = color;
  for (let step = 0.1; contrast(out, bg) < min && step <= 1; step += 0.1) out = mix(color, target, step);
  return out;
}

/** Black or white text, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrast("#ffffff", bg) >= contrast("#0b0d12", bg) ? "#ffffff" : "#0b0d12";
}
