/** Icon for a link without an image, guessed from where it points. */
export type LinkKind = "map" | "store" | "video" | "link";

export function linkKind(url: string): LinkKind {
  let host = "", path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname;
  } catch {
    return "link";
  }
  if (/(^|\.)maps\.(google|apple)\.com$/.test(host) || host === "maps.app.goo.gl" || host === "goo.gl" && path.startsWith("/maps") || /^google\.[a-z.]+$/.test(host) && path.startsWith("/maps")) return "map";
  if (/(^|\.)(salla\.sa|salla\.com|zid\.store|zid\.sa|myshopify\.com|shopify\.com|etsy\.com|gumroad\.com|amazon\.[a-z.]+|noon\.com)$/.test(host)) return "store";
  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) return "video";
  return "link";
}
