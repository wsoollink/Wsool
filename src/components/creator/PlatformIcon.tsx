import {
  siDiscord, siFacebook, siInstagram, siPinterest, siSnapchat, siSpotify, siTelegram, siThreads, siTiktok, siTwitch, siWhatsapp,
  siX, siYoutube,
} from "simple-icons";
import type { Platform } from "@/generated/prisma/enums";

// simple-icons has no LinkedIn mark; this is a plain "in" glyph in a rounded square.
const LINKEDIN_PATH =
  "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z";

// Jaco (Saudi live streaming app) isn't in simple-icons: its speech-bubble mark, traced from the
// owner's file. The circle runs the other way so it stays a hole (nonzero fill, also in the PDF).
const JACO_PATH =
  "M1 5.5A4.4 4.4 0 0 1 5.4 1.1H13.47V19.19L7.6 22.61V19.19H5.4A4.4 4.4 0 0 1 1 14.79ZM9.7 7.21A2.44 2.44 0 1 0 4.81 7.21A2.44 2.44 0 1 0 9.7 7.21ZM14.35 1.1H18.6A4.4 4.4 0 0 1 23 5.5V12.1H14.35ZM14.35 12.93H19.82V15.52A3.67 3.67 0 0 1 16.16 19.19H14.35Z";

/**
 * Rewrites a path with one space between every command and number. simple-icons
 * writes arc flags packed together ("a1 1 0 00.5.5"), which pdf-lib's parser
 * misreads (broken Discord/WhatsApp icons in the PDF); browsers accept both.
 */
function spacedPath(d: string) {
  const out: string[] = [];
  const number = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i;
  let command = "";
  let arg = 0;
  for (let i = 0; i < d.length; ) {
    const c = d[i];
    if (/[a-z]/i.test(c)) {
      out.push(c); command = c; arg = 0; i++;
    } else if (/[\s,]/.test(c)) {
      i++;
    } else if ((command === "a" || command === "A") && (arg % 7 === 3 || arg % 7 === 4)) {
      out.push(c); arg++; i++; // large-arc / sweep flag: a single 0 or 1
    } else {
      const m = d.slice(i).match(number);
      if (!m) throw new Error(`Bad path at ${i}`);
      out.push(m[0]); arg++; i += m[0].length;
    }
  }
  return out.join(" ");
}

const RAW_ICON_PATHS: Record<Platform | "whatsapp", string> = {
  tiktok: siTiktok.path,
  instagram: siInstagram.path,
  x: siX.path,
  youtube: siYoutube.path,
  snapchat: siSnapchat.path,
  threads: siThreads.path,
  telegram: siTelegram.path,
  facebook: siFacebook.path,
  linkedin: LINKEDIN_PATH,
  pinterest: siPinterest.path,
  twitch: siTwitch.path,
  jaco: JACO_PATH,
  discord: siDiscord.path,
  spotify: siSpotify.path,
  whatsapp: siWhatsapp.path,
};

export const PLATFORM_ICON_PATHS = Object.fromEntries(
  Object.entries(RAW_ICON_PATHS).map(([platform, d]) => [platform, spacedPath(d)]),
) as Record<Platform | "whatsapp", string>;

/** Decorative brand icon; give the surrounding link an accessible name. */
export function PlatformIcon({ platform, size = 20, className }: { platform: Platform | "whatsapp"; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={className}>
      <path d={PLATFORM_ICON_PATHS[platform]} />
    </svg>
  );
}
