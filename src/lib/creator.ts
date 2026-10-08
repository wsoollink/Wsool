import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * The signed-in creator and their page. Signed-out visitors go to login,
 * users without a page go to onboarding, suspended accounts to /suspended.
 * Use in every dashboard page and action.
 */
export const requireCreator = cache(async () => {
  const user = await requireUser();
  const row = await db.page.findUnique({ where: { userId: user.id }, include: { user: { select: { suspendedAt: true } } } });
  if (!row) {
    // A suspended account without a page still can't create one.
    const account = await db.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true } });
    redirect(account?.suspendedAt ? "/suspended" : "/onboarding");
  }
  // Staff suspended the account: no dashboard access (pages and actions).
  if (row.user.suspendedAt) redirect("/suspended");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop the joined user row
  const { user: _owner, ...page } = row;
  return { user, page };
});
