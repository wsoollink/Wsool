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
};

export const PLATFORMS = Object.keys(PLATFORM_NAMES) as Platform[];

/** Profile URL built on the server from platform + handle (no free-form links). */
const PROFILE_URLS: Record<Platform, (h: string) => string> = {
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  instagram: (h) => `https://www.instagram.com/${h}`,
  x: (h) => `https://x.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  telegram: (h) => `https://t.me/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
};

export function profileUrl(platform: Platform, handle: string) {
  return PROFILE_URLS[platform](encodeURIComponent(handle));
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
