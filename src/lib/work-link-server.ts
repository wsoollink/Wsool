import "server-only";
import { isTikTokShortLink, parseWorkLink, type WorkLink } from "@/lib/work-link";

/**
 * Network side of work links: TikTok share links are followed to the video
 * URL, and a cover image is fetched for YouTube (thumbnail) and TikTok
 * (oEmbed) and Instagram (the image on the post's public embed page; its
 * oEmbed needs a Facebook app token). Only these platforms' own hosts are
 * ever fetched.
 */

const TIMEOUT = 8000;
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Hosts Instagram serves post images from. */
const INSTAGRAM_IMAGE_HOSTS = [".cdninstagram.com", ".fbcdn.net"];
/** Hosts TikTok serves oEmbed thumbnails from. */
const TIKTOK_IMAGE_HOSTS = [".tiktokcdn.com", ".tiktokcdn-us.com", ".tiktokcdn-eu.com", ".tiktokv.com", ".tiktokv.us", ".tiktokv.eu", ".ibytedtos.com", ".byteimg.com", ".muscdn.com"];

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
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { "user-agent": "Mozilla/5.0" } });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !IMAGE_TYPES.includes(type)) {
      console.warn("[work-link] cover image refused", res.status, type, new URL(url).hostname);
      return null;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_BYTES ? { bytes, type } : null;
  } catch (err) {
    console.warn("[work-link] cover image failed", new URL(url).hostname, String(err));
    return null;
  }
}

/** TikTok's cover for a video (the oEmbed thumbnail), or null. */
async function tiktokCover(link: WorkLink): Promise<{ bytes: Buffer; type: string } | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(link.url)}`, { signal: AbortSignal.timeout(TIMEOUT), headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.warn("[work-link] tiktok oembed", res.status, link.id);
      return null;
    }
    const thumb = ((await res.json()) as { thumbnail_url?: unknown }).thumbnail_url;
    if (typeof thumb !== "string" || !thumb.startsWith("https://")) {
      console.warn("[work-link] tiktok oembed without thumbnail", link.id);
      return null;
    }
    const host = new URL(thumb).hostname.toLowerCase();
    if (!TIKTOK_IMAGE_HOSTS.some((h) => host.endsWith(h))) {
      console.warn("[work-link] tiktok thumbnail host not allowed", host);
      return null;
    }
    return image(thumb);
  } catch (err) {
    console.warn("[work-link] tiktok oembed failed", link.id, String(err));
    return null;
  }
}

const decodeHtml = (v: string) => v.replace(/&amp;/g, "&").replace(/\\u0026/g, "&").replace(/\\\//g, "/");

/** Instagram's image for a post or reel, read from its public embed page, or null. */
async function instagramCover(link: WorkLink): Promise<{ bytes: Buffer; type: string } | null> {
  try {
    const res = await fetch(link.embed.replace(/\/embed$/, "/embed/"), { signal: AbortSignal.timeout(TIMEOUT), headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } });
    if (!res.ok) {
      console.warn("[work-link] instagram embed", res.status, link.id);
      return null;
    }
    const html = (await res.text()).slice(0, 2_000_000);
    const img = html.match(/<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/)?.[0];
    const found = img?.match(/\ssrc="([^"]+)"/)?.[1] ?? html.match(/"display_url":"([^"]+)"/)?.[1] ?? html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1];
    if (!found) {
      console.warn("[work-link] instagram embed without image", link.id);
      return null;
    }
    const url = decodeHtml(found);
    const host = new URL(url).hostname.toLowerCase();
    if (!url.startsWith("https://") || !INSTAGRAM_IMAGE_HOSTS.some((h) => host.endsWith(h))) {
      console.warn("[work-link] instagram image host not allowed", host);
      return null;
    }
    return image(url);
  } catch (err) {
    console.warn("[work-link] instagram embed failed", link.id, String(err));
    return null;
  }
}

/** Cover image for a work link, or null (the platform didn't answer). */
export async function workLinkCover(link: WorkLink): Promise<{ bytes: Buffer; type: string } | null> {
  if (link.platform === "youtube") {
    // Shorts have a portrait frame ("oar2"); every video has hqdefault.
    return (link.portrait && (await image(`https://i.ytimg.com/vi/${link.id}/oar2.jpg`))) || image(`https://i.ytimg.com/vi/${link.id}/hqdefault.jpg`);
  }
  if (link.platform === "tiktok") {
    // TikTok sometimes refuses a request (rate limit): one more try after a short pause.
    const first = await tiktokCover(link);
    if (first) return first;
    await new Promise((done) => setTimeout(done, 1200));
    return tiktokCover(link);
  }
  return instagramCover(link);
}
