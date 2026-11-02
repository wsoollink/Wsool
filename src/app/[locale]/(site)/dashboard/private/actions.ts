"use server";

import { z } from "zod";
import { hasPro } from "@/config/plans";
import { requireCreator } from "@/lib/creator";
import { db } from "@/lib/db";
import { createPrivateLink, revokePrivateLink, setPagePassword } from "@/lib/private-view";
import { pageChanged } from "@/lib/public-page";
import { siteOrigin } from "@/lib/site-url";
import { pagePasswordSchema, privateLinkSchema } from "@/lib/validation/private-view";

// Unscoped requireCreator(): the private view is the creator's own, never an agency acting for them.
type Result = { ok?: true; url?: string; error?: "invalid" | "pro_only" | "limit" };

async function isPro(userId: string) {
  return hasPro(await db.subscription.findUnique({ where: { userId }, select: { status: true, trialEndsAt: true } }));
}

/** Sets the page password (Pro), or removes it with null. Both log out everyone who opened it with the old one. */
export async function savePagePassword(password: string | null): Promise<Result> {
  const { user, page } = await requireCreator();
  if (password === null) {
    await setPagePassword(page.id, null);
  } else {
    const parsed = pagePasswordSchema.safeParse(password);
    if (!parsed.success) return { error: "invalid" };
    if (!(await isPro(user.id))) return { error: "pro_only" };
    await setPagePassword(page.id, parsed.data);
  }
  pageChanged(page.username);
  return { ok: true };
}

export async function addPrivateLink(input: z.input<typeof privateLinkSchema>): Promise<Result> {
  const { user, page } = await requireCreator();
  const parsed = privateLinkSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  if (!(await isPro(user.id))) return { error: "pro_only" };
  const made = await createPrivateLink(page.id, parsed.data.name, parsed.data.days);
  if (!made) return { error: "limit" };
  return { ok: true, url: `${siteOrigin()}/${page.username}?k=${made.token}` };
}

export async function removePrivateLink(id: string): Promise<Result> {
  const { page } = await requireCreator();
  if (!z.uuid().safeParse(id).success) return { error: "invalid" };
  return (await revokePrivateLink(page.id, id)) ? { ok: true } : { error: "invalid" };
}
