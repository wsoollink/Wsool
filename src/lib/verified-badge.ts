/**
 * Verified badge in Meta's style (owner, Nov 2026): a blue wavy-edged circle with a white check, the same on the creator
 * page, PDF and link preview. The shape is built here so every surface draws the exact same outline.
 */
export const VERIFIED_BLUE = "#0095F6";

/** Wavy circle centred at (cx, cy): `bumps` soft points around radius r. Plain line segments, fine at any size. */
export function badgeShape(cx: number, cy: number, r: number, bumps = 12, depth = 0.085): string {
  const steps = bumps * 10;
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 - depth / 2 + (depth / 2) * Math.cos(bumps * a));
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** The badge outline and check in a 24 × 24 box (web SVGs). */
export const BADGE_PATH = badgeShape(12, 12, 11.5);
export const BADGE_CHECK = "M7.6 12.4l3 3 5.8-6.2";
