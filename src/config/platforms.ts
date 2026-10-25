import type { Platform } from "@/generated/prisma/enums";

/** Platform names are always shown in English (CLAUDE.md section 3). */
export const PLATFORM_NAMES: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  youtube: "YouTube",
  snapchat: "Snapchat",
  threads: "Threads",
  telegram: "Telegram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  twitch: "Twitch",
  jaco: "Jaco",
  discord: "Discord",
  spotify: "Spotify",
};

export const PLATFORMS = Object.keys(PLATFORM_NAMES) as Platform[];

/**
 * Platforms whose profile link can't be built from a username: the creator
 * pastes it and `linkProfileUrl()` accepts only that platform's own domain.
 * Discord = a server invite (followers = members), Spotify = artist/podcast/user.
 */
export const LINK_PLATFORMS: readonly Platform[] = ["spotify", "discord", "jaco"];
/** Linked platforms whose API also gives audience data (src/lib/connect); the others update followers only. */
export const CONNECT_AUDIENCE: readonly Platform[] = ["youtube"];
export const needsLink = (platform: Platform) => LINK_PLATFORMS.includes(platform);

/** Profile URL built on the server from platform + handle (no free-form links). */
const PROFILE_URLS: Partial<Record<Platform, (h: string) => string>> = {
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  instagram: (h) => `https://www.instagram.com/${h}`,
  x: (h) => `https://x.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  telegram: (h) => `https://t.me/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
  pinterest: (h) => `https://www.pinterest.com/${h}`,
  twitch: (h) => `https://www.twitch.tv/${h}`,
};

/** Null for the link platforms (their URL comes from `linkProfileUrl()`). */
export function profileUrl(platform: Platform, handle: string): string | null {
  const build = PROFILE_URLS[platform];
  return build ? build(encodeURIComponent(handle)) : null;
}

const SEGMENT = /^[A-Za-z0-9._~-]{1,100}$/;

/**
 * Checks a pasted profile link for a link platform and returns a clean https
 * URL on that platform's own domain, or null. Never accepts other sites.
 */
export function linkProfileUrl(platform: Platform, input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 300) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (platform === "spotify") {
    // open.spotify.com/(intl-ar/)artist|show|user/<id>
    const i = parts.findIndex((p) => p === "artist" || p === "show" || p === "user");
    const id = parts[i + 1];
    if (host !== "open.spotify.com" || i < 0 || !id || !SEGMENT.test(id)) return null;
    return `https://open.spotify.com/${parts[i]}/${id}`;
  }
  if (platform === "discord") {
    // discord.gg/<code> or discord.com/invite/<code>
    const code = host === "discord.gg" ? parts[0] : (host === "discord.com" || host === "discordapp.com") && parts[0] === "invite" ? parts[1] : undefined;
    if (!code || !/^[A-Za-z0-9-]{2,40}$/.test(code)) return null;
    return `https://discord.gg/${code}`;
  }
  if (platform === "jaco") {
    // Jaco's share links may carry the user id in the query, so it is kept.
    if (host !== "jaco.live" && !host.endsWith(".jaco.live")) return null;
    if (!parts.every((p) => SEGMENT.test(p))) return null;
    url.protocol = "https:";
    url.hash = "";
    return url.toString();
  }
  return null;
}

/** Letters, digits, dot, underscore, dash. */
export const HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;

/**
 * Cleans what the creator typed or pasted: "@name", a full profile link
 * ("https://www.tiktok.com/@name?lang=ar") or "name" all become "name".
 */
export function normalizeHandle(input: string) {
  let value = input.trim();
  if (/^(https?:\/\/|www\.)/i.test(value)) {
    const path = value.replace(/^[a-z]+:\/\//i, "").split(/[?#]/)[0].split("/").filter(Boolean);
    const skip = new Set(["add", "in", "c", "user"]);
    value = path.slice(1).filter((p) => !skip.has(p.toLowerCase())).pop() ?? "";
  }
  return value.replace(/^@+/, "");
}
