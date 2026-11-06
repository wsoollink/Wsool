import "server-only";
import { UPLOAD_KINDS, type UploadKind } from "@/config/uploads";
import { releaseLinks } from "@/lib/connect";
import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Days between "delete my account" and permanent deletion (undo window). */
export const DELETE_AFTER_DAYS = 30;

/**
 * Permanently deletes accounts whose undo window has passed: their files in
 * storage, all their rows (cascade from users), and the sign-in account.
 * The username becomes free again.
 */
export async function purgeDeletedAccounts(now = new Date()) {
  const cutoff = new Date(now.getTime() - DELETE_AFTER_DAYS * 86_400_000);
  const pages = await db.page.findMany({ where: { deletedAt: { lte: cutoff } }, select: { userId: true, user: { select: { email: true } } } });
  const supabase = createSupabaseAdmin();
  let purged = 0;
  for (const { userId, user } of pages) {
    // Platform links go with the account: revoke them (Telegram's bot leaves the channel) before the rows are deleted.
    await releaseLinks({ userId }).catch(() => {});
    for (const kind of Object.keys(UPLOAD_KINDS) as UploadKind[]) {
      const bucket = supabase.storage.from(UPLOAD_KINDS[kind].bucket);
      const { data } = await bucket.list(`${userId}/${kind}`, { limit: 1000 });
      if (data?.length) await bucket.remove(data.map((f) => `${userId}/${kind}/${f.name}`));
    }
    await db.user.delete({ where: { id: userId } });
    // Off the newsletter lists too (rows are keyed by email, not by user).
    await db.newsletterSubscriber.deleteMany({ where: { email: user.email.toLowerCase() } });
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    purged++;
  }
  return purged;
}
