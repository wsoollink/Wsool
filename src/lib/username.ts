import "server-only";
import {
  normalizeUsername,
  USERNAME_CHANGE_COOLDOWN_DAYS,
  usernameFormatError,
  type UsernameFormatError,
} from "@/config/usernames";
import { db } from "@/lib/db";

export type UsernameError = UsernameFormatError | "taken";

/**
 * Full availability check: format, reserved names (code + staff table) and
 * whether another page already uses it. `userId` lets a creator re-check
 * their own current name without it counting as taken.
 */
export async function usernameError(rawName: string, userId?: string): Promise<UsernameError | null> {
  const name = normalizeUsername(rawName);
  const formatError = usernameFormatError(name);
  if (formatError) return formatError;

  const [reserved, page, moved] = await Promise.all([
    db.reservedUsername.findUnique({ where: { name }, select: { name: true } }),
    db.page.findUnique({ where: { username: name }, select: { userId: true } }),
    // A name another creator left less than 30 days ago still points to them.
    db.usernameRedirect.findFirst({ where: { name, releasedAt: { gt: new Date() } }, select: { page: { select: { userId: true } } } }),
  ]);
  if (reserved) return "reserved";
  if (page && page.userId !== userId) return "taken";
  if (moved && moved.page.userId !== userId) return "taken";
  return null;
}

/** Days an old username keeps redirecting (and stays blocked for others) after a change. */
export const USERNAME_REDIRECT_DAYS = USERNAME_CHANGE_COOLDOWN_DAYS;

/** When the creator may change their username again (null = now). */
export function nextUsernameChange(changedAt: Date | null | undefined, now = new Date()): Date | null {
  if (!changedAt) return null;
  const next = new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 86_400_000);
  return next > now ? next : null;
}
