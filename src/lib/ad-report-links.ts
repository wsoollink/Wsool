import { parseWorkLink } from "@/lib/work-link";

/**
 * Ad reports (owner, Nov 2026): the post links a creator adds to a report. Pure (no network), shared by the browser and the
 * server. Only platforms whose linked account can read one post's numbers are accepted: YouTube, Instagram, Threads and
 * Facebook Pages (TikTok needs another TikTok permission, X is paid per call: later).
 */
export const REPORT_PLATFORMS = ["youtube", "instagram", "threads", "facebook"] as const;
export type ReportPlatform = (typeof REPORT_PLATFORMS)[number];

/** `key` = what identifies the post on its platform (video id, shortcode, or Facebook's id in the link). */
export type ReportPost = { platform: ReportPlatform; key: string; url: string };

const CODE = /^[A-Za-z0-9_-]{4,80}$/;
const FB_ID = /^(?:\d{5,30}|pfbid[A-Za-z0-9]{10,100})$/;

function toUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export function parseReportPost(input: string): ReportPost | null {
  const work = parseWorkLink(input);
  if (work && work.platform !== "tiktok") return { platform: work.platform, key: work.id, url: work.url };

  const url = toUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|web\.|mbasic\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);

  // threads.net / threads.com: /@user/post/<code>
  if (host === "threads.net" || host === "threads.com") {
    const at = parts.indexOf("post");
    const user = parts[at - 1], code = parts[at + 1];
    if (at < 1 || !user?.startsWith("@") || !code || !CODE.test(code)) return null;
    return { platform: "threads", key: code, url: `https://www.threads.net/${user}/post/${code}` };
  }

  // facebook.com: the post's own id, from the many link shapes Facebook uses.
  if (host === "facebook.com" || host === "fb.com") {
    const q = url.searchParams;
    const after = (word: string) => { const i = parts.indexOf(word); return i >= 0 ? parts[i + 1] : undefined; };
    const id = q.get("story_fbid") ?? after("posts") ?? after("videos") ?? after("reel") ?? q.get("v") ?? q.get("fbid") ?? undefined;
    if (!id || !FB_ID.test(id)) return null;
    url.hash = "";
    return { platform: "facebook", key: id, url: url.toString() };
  }

  return null;
}
