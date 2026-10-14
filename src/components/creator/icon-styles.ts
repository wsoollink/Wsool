import type { Platform } from "@/generated/prisma/enums";

/**
 * Outline brand glyphs for the "outline" icon style (social icons row).
 * From Tabler Icons (MIT, (c) Paweł Kuna, https://tabler.io/icons): 24x24,
 * drawn with stroke="currentColor" stroke-width 2, round caps/joins, no fill.
 * Jaco isn't in Tabler: drawn here after the owner's mark.
 */
export const OUTLINE_ICON_PATHS: Record<Platform | "whatsapp", string[]> = {
  tiktok: ["M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917"],
  instagram: ["M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4l0 -10", "M8.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 0 0 -7 0", "M17 7v.01"],
  x: ["M4 4l11.733 16h4.267l-11.733 -16l-4.267 0", "M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"],
  youtube: ["M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8", "M10 9l5 3l-5 3l0 -6"],
  snapchat: ["M16.882 7.842a4.882 4.882 0 0 0 -9.764 0c0 4.273 -.213 6.409 -4.118 8.118c2 .882 2 .882 3 3c3 0 4 2 6 2s3 -2 6 -2c1 -2.118 1 -2.118 3 -3c-3.906 -1.709 -4.118 -3.845 -4.118 -8.118m-13.882 8.119c4 -2.118 4 -4.118 1 -7.118m17 7.118c-4 -2.118 -4 -4.118 -1 -7.118"],
  threads: ["M19 7.5c-1.333 -3 -3.667 -4.5 -7 -4.5c-5 0 -8 2.5 -8 9s3.5 9 8 9s7 -3 7 -5s-1 -5 -7 -5c-2.5 0 -3 1.25 -3 2.5c0 1.5 1 2.5 2.5 2.5c2.5 0 3.5 -1.5 3.5 -5s-2 -4 -3 -4s-1.833 .333 -2.5 1"],
  telegram: ["M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4"],
  facebook: ["M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"],
  linkedin: ["M8 11v5", "M8 8v.01", "M12 16v-5", "M16 16v-3a2 2 0 1 0 -4 0", "M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4l0 -10"],
  pinterest: ["M8 20l4 -9", "M10.7 14c.437 1.263 1.43 2 2.55 2c2.071 0 3.75 -1.554 3.75 -4a5 5 0 1 0 -9.7 1.7", "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"],
  twitch: ["M4 5v11a1 1 0 0 0 1 1h2v4l4 -4h5.584c.266 0 .52 -.105 .707 -.293l2.415 -2.414c.187 -.188 .293 -.442 .293 -.708v-8.585a1 1 0 0 0 -1 -1h-14a1 1 0 0 0 -1 1l.001 0", "M16 8l0 4", "M12 8l0 4"],
  discord: ["M8 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0", "M14 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0", "M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-.972 1.923a11.913 11.913 0 0 0 -4.053 0l-.975 -1.923c-1.5 .16 -3.043 .485 -4.5 1.5c-2 5.667 -2.167 9.833 -1.5 11.5c.667 1.333 2 3 3.5 3c.5 0 2 -2 2 -3", "M7 16.5c3.5 1 6.5 1 10 0"],
  spotify: ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M8 11.973c2.5 -1.473 5.5 -.973 7.5 .527", "M9 15c1.5 -1 4 -1 5 .5", "M7 9c2 -1 6 -2 10 .5"],
  whatsapp: ["M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9", "M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"],
  jaco: ["M6 3h11a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-7l-3.5 2.5v-2.5h-.5a4 4 0 0 1 -4 -4v-8a4 4 0 0 1 4 -4", "M13.5 3v16", "M13.5 11.5h7.5", "M6.25 8.25a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0 -3.5 0"],
};

/**
 * Brand colours for the "color" icon style (white glyph on the colour;
 * Snapchat keeps a black ghost on its yellow). Instagram uses its gradient.
 */
export const BRAND_COLORS: Record<Platform | "whatsapp", { bg: string; fg?: string }> = {
  tiktok: { bg: "#000000" },
  instagram: { bg: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)" },
  x: { bg: "#000000" },
  youtube: { bg: "#ff0000" },
  snapchat: { bg: "#fffc00", fg: "#000000" },
  threads: { bg: "#000000" },
  telegram: { bg: "#26a5e4" },
  facebook: { bg: "#1877f2" },
  linkedin: { bg: "#0a66c2" },
  pinterest: { bg: "#bd081c" },
  twitch: { bg: "#9146ff" },
  jaco: { bg: "#111111" },
  discord: { bg: "#5865f2" },
  spotify: { bg: "#1db954" },
  whatsapp: { bg: "#25d366" },
};
