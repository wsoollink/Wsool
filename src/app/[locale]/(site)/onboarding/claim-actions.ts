"use server";

import { z } from "zod";
import { ensureAccount } from "@/lib/account";
import { claimDraft, declineDraft } from "@/lib/agency-drafts";
import { requireUser } from "@/lib/auth";

/** The signed-in creator claims (or declines) a page an agency prepared for their email. */
const perms = z.object({ content: z.boolean(), rates: z.boolean(), contact: z.boolean() });

export async function claimPreparedPage(linkId: string, p: z.input<typeof perms>): Promise<{ ok?: true; error?: "invalid" | "has_page" }> {
  const user = await requireUser();
  const pp = perms.safeParse(p);
  if (!z.uuid().safeParse(linkId).success || !pp.success) return { error: "invalid" };
  await ensureAccount(user);
  const res = await claimDraft(user, linkId, pp.data);
  return "error" in res ? res : { ok: true };
}

export async function declinePreparedPage(linkId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!z.uuid().safeParse(linkId).success) return { ok: false };
  return { ok: await declineDraft(user, linkId) };
}
