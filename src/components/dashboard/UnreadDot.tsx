import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Blue dot on the bell when there are unread notifications (server, in Suspense). */
export async function UnreadDot({ label }: { label: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  if (!unread) return null;
  return (
    <>
      <span aria-hidden="true" className="absolute end-2 top-2 size-2 rounded-full bg-bad ring-2 ring-card" />
      <span className="sr-only">{label}</span>
    </>
  );
}
