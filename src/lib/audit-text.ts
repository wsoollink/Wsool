import "server-only";
import { getTranslations } from "next-intl/server";
import { PLATFORM_NAMES } from "@/config/platforms";
import { db } from "@/lib/db";

type Entry = { action: string; targetType: string | null; targetId: string | null; details: unknown };

/**
 * Turns audit log rows into readable sentences ("Verified TikTok @nora")
 * instead of action keys and raw JSON (admin design). User targets are shown
 * by their username (or email without a page).
 */
export async function auditSentences(entries: Entry[]) {
  // Action keys come from the database, so the translator is used untyped.
  const t = (await getTranslations("Admin.sentence")) as unknown as { has: (k: string) => boolean; (k: string, v: Record<string, string>): string };
  const userIds = [...new Set(entries.filter((e) => e.targetType === "user" && e.targetId).map((e) => e.targetId!))];
  const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, page: { select: { username: true } } } }) : [];
  // A user without a page is shown by email.
  const username = new Map(users.map((u) => [u.id, u.page?.username ?? u.email]));

  return entries.map((e) => {
    const d = (e.details && typeof e.details === "object" ? e.details : {}) as Record<string, unknown>;
    const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    const values = {
      platform: d.platform ? PLATFORM_NAMES[d.platform as keyof typeof PLATFORM_NAMES] ?? str(d.platform) : "",
      handle: str(d.handle),
      name: str(d.name),
      username: str(d.username) || (e.targetType === "user" && e.targetId ? username.get(e.targetId) ?? "" : ""),
      days: str(d.days),
      email: str(d.email),
      label: str(d.label),
      count: str(d.count),
      subject: str(d.subject),
      percent: str(d.percent),
      code: str(d.code),
      added: str(d.added),
      removed: str(d.removed),
    };
    return t.has(e.action) ? t(e.action, values) : e.action;
  });
}
