import "server-only";
import { createHash } from "node:crypto";

/** Likely bots and link-preview crawlers: never counted. */
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|curl|wget|python|node-fetch/i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

/** First day (UTC) of today, the key for daily stats. */
export function today(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Anonymous visitor id for unique counts: a hash of IP + browser + page +
 * day with a server secret. It changes every day and can't be turned back
 * into an IP; the IP itself is never stored.
 */
export function visitorHash(ip: string, ua: string, pageId: string, day: Date) {
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "local";
  return createHash("sha256").update([secret, ip, ua, pageId, day.toISOString().slice(0, 10)].join("|")).digest("hex").slice(0, 32);
}

export function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop";
}

/** Country code from Cloudflare or Netlify headers. */
export function countryOf(headers: Headers): string | null {
  const cf = headers.get("cf-ipcountry");
  if (cf && /^[A-Z]{2}$/.test(cf) && cf !== "XX" && cf !== "T1") return cf;
  const geo = headers.get("x-nf-geo");
  if (geo) {
    try {
      const code = JSON.parse(Buffer.from(geo, "base64").toString("utf8"))?.country?.code;
      if (typeof code === "string" && /^[A-Z]{2}$/.test(code)) return code;
    } catch {}
  }
  return null;
}

/** Referring site's host without "www." / "m." / "l.", ignoring our own domain. */
export function referrerHost(ref: string | null, ownHost: string): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.toLowerCase().replace(/^(www|m|l|lm)\./, "");
    return host && host !== ownHost.replace(/^www\./, "") ? host.slice(0, 100) : null;
  } catch {
    return null;
  }
}

/** Per visitor, page and day: more than this is ignored (refresh spam). */
export const MAX_EVENTS_PER_VISITOR_DAY = 20;
