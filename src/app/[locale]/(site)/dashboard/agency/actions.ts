"use server";

import { z } from "zod";
import { acceptInvite, declineInvite, endLink } from "@/lib/agency";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";

// Unscoped requireCreator(): only the creator themself, never an agency acting for them.
const perms = z.object({ content: z.boolean(), rates: z.boolean(), contact: z.boolean() });
type Result = { ok?: true; error?: "invalid" };

export async function acceptAgency(linkId: string, p: z.input<typeof perms>): Promise<Result> {
  const { page } = await requireCreator();
  const pp = perms.safeParse(p);
  if (!z.uuid().safeParse(linkId).success || !pp.success) return { error: "invalid" };
  return (await acceptInvite(page, linkId, pp.data)) ? { ok: true } : { error: "invalid" };
}

export async function declineAgency(linkId: string): Promise<Result> {
  const { page } = await requireCreator();
  if (!z.uuid().safeParse(linkId).success) return { error: "invalid" };
  return (await declineInvite(page.id, linkId)) ? { ok: true } : { error: "invalid" };
}

/** The creator changes what the linked agency may edit (applies on the agency's next call). */
export async function updateAgencyPerms(p: z.input<typeof perms>): Promise<Result> {
  const { page } = await requireCreator();
  const pp = perms.safeParse(p);
  if (!pp.success) return { error: "invalid" };
  const { count } = await db.agencyLink.updateMany({
    where: { pageId: page.id, status: "active" },
    data: { canContent: pp.data.content, canRates: pp.data.rates, canContact: pp.data.contact },
  });
  return count ? { ok: true } : { error: "invalid" };
}

export async function unlinkAgency(): Promise<Result> {
  const { page } = await requireCreator();
  const link = await db.agencyLink.findFirst({ where: { pageId: page.id, status: "active" }, select: { id: true } });
  if (!link) return { error: "invalid" };
  return (await endLink(link.id, "creator", { pageId: page.id })) ? { ok: true } : { error: "invalid" };
}
