import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { actingFor, getMembership, type ActScope } from "@/lib/agency";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type Acting = { linkId: string; agencyName: string; perms: { content: boolean; rates: boolean; contact: boolean }; role: string };

/**
 * The signed-in creator and their page. Signed-out visitors go to login,
 * users without a page go to onboarding, suspended accounts to /suspended.
 * Use in every dashboard page and action.
 *
 * `scope` opts a page/action into agency acting mode (src/lib/agency.ts): while an agency member acts for a
 * creator, only calls whose scope the creator allowed get that creator's page ("view" always); calls without a
 * scope are refused, so new sections stay private by default.
 */
export const requireCreator = cache(async (scope?: ActScope) => {
  const user = await requireUser();
  const acting = await actingFor(user, scope);
  if (acting === "ended") redirect("/agency/exit");
  if (acting === "denied") redirect("/dashboard?denied=1");
  if (acting) return acting;

  const row = await db.page.findUnique({ where: { userId: user.id }, include: { user: { select: { suspendedAt: true } } } });
  if (!row) {
    // A suspended account without a page still can't create one.
    const account = await db.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true } });
    if (account?.suspendedAt) redirect("/suspended");
    // Invited to an agency / brand team (no creator page of their own): their home is the agency dashboard.
    if (await getMembership(user)) redirect("/agency");
    // Staff without a creator page of their own: their home is the admin panel.
    if (await getAdmin()) redirect("/admin");
    redirect("/onboarding");
  }
  // Staff suspended the account: no dashboard access (pages and actions).
  if (row.user.suspendedAt) redirect("/suspended");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop the joined user row
  const { user: _owner, ...page } = row;
  return { user, page, acting: null as Acting | null };
});
