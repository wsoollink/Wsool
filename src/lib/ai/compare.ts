import { normalizeHandle } from "@/config/platforms";
import type { Platform } from "@/generated/prisma/enums";

/** What the AI reads from an account screenshot (stored in ai_reads.result / verification_requests.ai_result). */
export type AccountRead = {
  is_profile_page: boolean;
  platform: Platform | "unknown";
  username: string | null;
  followers: number | null;
  followers_as_shown: string | null;
  quality: "clear" | "blurry" | "cropped";
  note: string;
};

export type Check = "match" | "close" | "mismatch" | "unknown";
export type ReadComparison = {
  platform: Check;
  username: Check;
  followers: Check;
  /** "match": username + followers fit; "check": something differs; "unreadable": not a usable profile screenshot. */
  overall: "match" | "check" | "unreadable";
};

/** Pages show rounded counts ("248K"), so a few percent off still counts as the same number. */
const FOLLOWERS_MATCH = 0.03;
const FOLLOWERS_CLOSE = 0.1;

const handleKey = (h: string) => h.trim().replace(/^@+/, "").toLowerCase();

/** Compares an AI reading with what the creator entered (pure; used by the creator page and the staff queue). */
export function compareRead(read: AccountRead, expected: { platform: Platform; handle: string; followers: number }): ReadComparison {
  const platform: Check = read.platform === "unknown" ? "unknown" : read.platform === expected.platform ? "match" : "mismatch";
  const seen = read.username ? normalizeHandle(read.username) : null;
  const username: Check = !seen ? "unknown" : handleKey(seen) === handleKey(expected.handle) ? "match" : "mismatch";
  let followers: Check = "unknown";
  if (read.followers !== null) {
    const diff = Math.abs(read.followers - expected.followers) / Math.max(expected.followers, 1);
    followers = diff <= FOLLOWERS_MATCH ? "match" : diff <= FOLLOWERS_CLOSE ? "close" : "mismatch";
  }
  const unreadable = !read.is_profile_page || (username === "unknown" && followers === "unknown");
  const overall = unreadable ? "unreadable" : username === "match" && followers === "match" && platform !== "mismatch" ? "match" : "check";
  return { platform, username, followers, overall };
}
