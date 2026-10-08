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
