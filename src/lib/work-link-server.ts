import "server-only";
import { isTikTokShortLink, parseWorkLink, type WorkLink } from "@/lib/work-link";

/**
 * Network side of work links: TikTok share links are followed to the video
 * URL, and a cover image is fetched for YouTube (thumbnail) and TikTok
 * (oEmbed). Instagram gives no cover without a Facebook app token: the creator
 * uploads one. Only these platforms' own hosts are ever fetched.
 */

const TIMEOUT = 8000;
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Hosts TikTok serves oEmbed thumbnails from. */
const TIKTOK_IMAGE_HOSTS = [".tiktokcdn.com", ".tiktokcdn-us.com", ".tiktokcdn-eu.com", ".ibytedtos.com", ".byteimg.com"];

export async function resolveWorkLink(input: string): Promise<WorkLink | null> {
  const direct = parseWorkLink(input);
  if (direct || !isTikTokShortLink(input)) return direct;
  // Follow at most 3 redirects, staying on tiktok.com.
  let current = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT), headers: { "user-agent": "Mozilla/5.0" } });
      const next = res.headers.get("location");
      if (!next) return null;
      current = new URL(next, current).toString();
      if (!/^https:\/\/([a-z0-9-]+\.)*tiktok\.com\//i.test(current)) return null;
      const parsed = parseWorkLink(current);
      if (parsed) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

async function image(url: string): Promise<{ bytes: Buffer; type: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !IMAGE_TYPES.includes(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_BYTES ? { bytes, type } : null;
  } catch {
    return null;
  }
}

/** Cover image for a work link, or null (Instagram, or the platform didn't answer). */
export async function workLinkCover(link: WorkLink): Promise<{ bytes: Buffer; type: string } | null> {
  if (link.platform === "youtube") {
    // Shorts have a portrait frame ("oar2"); every video has hqdefault.
    return (link.portrait && (await image(`https://i.ytimg.com/vi/${link.id}/oar2.jpg`))) || image(`https://i.ytimg.com/vi/${link.id}/hqdefault.jpg`);
  }
  if (link.platform === "tiktok") {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(link.url)}`, { signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) return null;
      const thumb = ((await res.json()) as { thumbnail_url?: unknown }).thumbnail_url;
      if (typeof thumb !== "string") return null;
      const host = new URL(thumb).hostname.toLowerCase();
      if (!thumb.startsWith("https://") || !TIKTOK_IMAGE_HOSTS.some((h) => host.endsWith(h))) return null;
      return image(thumb);
    } catch {
      return null;
    }
  }
  return null;
}
