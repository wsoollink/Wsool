/**
 * Past works can be a link to a post instead of an uploaded video. Only
 * TikTok, Instagram and YouTube are accepted; the link is cleaned to one
 * canonical form and gives the embed URL the creator page plays in its pop-up.
 * Pure (no network): shared by the dashboard, the server and the public page.
 */

export type WorkLinkPlatform = "tiktok" | "instagram" | "youtube";
export type WorkLink = {
  platform: WorkLinkPlatform;
  id: string;
  /** Canonical post URL (stored). */
  url: string;
  /** Player URL for the pop-up iframe. */
  embed: string;
  /** Portrait (TikTok, Reels, Shorts) or 16:9 (regular YouTube videos). */
  portrait: boolean;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const IG_ID = /^[A-Za-z0-9_-]{5,40}$/;
const TT_ID = /^\d{10,25}$/;
const TT_USER = /^@[A-Za-z0-9._]{1,40}$/;

function toUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 400) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.username || url.password || url.port ? null : url;
  } catch {
    return null;
  }
}

const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");

export function parseWorkLink(input: string): WorkLink | null {
  const url = toUrl(input);
  if (!url) return null;
  const host = hostOf(url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtu.be") {
    let id: string | undefined;
    let portrait = false;
    if (host === "youtu.be") id = parts[0];
    else if (parts[0] === "shorts") { id = parts[1]; portrait = true; }
    else if (parts[0] === "watch") id = url.searchParams.get("v") ?? undefined;
    else if (parts[0] === "embed" || parts[0] === "live") id = parts[1];
    if (!id || !YT_ID.test(id)) return null;
    return {
      platform: "youtube", id, portrait,
      url: portrait ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      embed: `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`,
    };
  }

  if (host === "tiktok.com") {
    // tiktok.com/@user/video/<id>
    const [user, kind, id] = parts;
    if (!user || !TT_USER.test(user) || kind !== "video" || !id || !TT_ID.test(id)) return null;
    return { platform: "tiktok", id, portrait: true, url: `https://www.tiktok.com/${user}/video/${id}`, embed: `https://www.tiktok.com/player/v1/${id}?autoplay=1&rel=0&music_info=0&description=0` };
  }

  if (host === "instagram.com") {
    // instagram.com/(user/)reel|reels|p|tv/<id>
    const at = parts.findIndex((p) => p === "reel" || p === "reels" || p === "p" || p === "tv");
    const id = parts[at + 1];
    if (at < 0 || !id || !IG_ID.test(id)) return null;
    const kind = parts[at] === "p" ? "p" : "reel";
    return { platform: "instagram", id, portrait: true, url: `https://www.instagram.com/${kind}/${id}/`, embed: `https://www.instagram.com/${kind}/${id}/embed` };
  }

  return null;
}

/** TikTok share links (vm.tiktok.com/…, tiktok.com/t/…) that only become a video link after a redirect. */
export function isTikTokShortLink(input: string) {
  const url = toUrl(input);
  if (!url) return false;
  const host = hostOf(url);
  return host === "vm.tiktok.com" || host === "vt.tiktok.com" || (host === "tiktok.com" && url.pathname.startsWith("/t/"));
}
