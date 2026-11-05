"use server";

import { z } from "zod";
import { normalizeUsername } from "@/config/usernames";
import { requireAgency } from "@/lib/agency";
import { createDraft, deleteDraft, resendDraft, type DraftError } from "@/lib/agency-drafts";
import { rateLimit } from "@/lib/rate-limit";

/** Pages prepared for new creators (owner, Nov 2026): owners and managers create, resend and delete; editors fill them in. */
const input = z.object({
  username: z.string().max(40).transform(normalizeUsername),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  lang: z.enum(["ar", "en"]),
});

export async function createDraftPage(raw: z.input<typeof input>): Promise<{ ok?: true; error?: DraftError | "rate" }> {
  const m = await requireAgency("manager");
  const data = input.safeParse(raw);
  if (!data.success) return { error: "invalid" };
  // Each draft emails someone: a cap per agency.
  if (!(await rateLimit(`agency-draft:${m.agency.id}`, 30, 86_400))) return { error: "rate" };
  return createDraft(m, data.data);
}

export async function resendDraftEmail(linkId: string): Promise<{ ok: boolean }> {
  const m = await requireAgency("manager");
  if (!z.uuid().safeParse(linkId).success || !(await rateLimit(`agency-draft-resend:${linkId}`, 3, 86_400))) return { ok: false };
  return { ok: await resendDraft(m.agency.id, m.agency.name, linkId) };
}

export async function deleteDraftPage(linkId: string): Promise<{ ok: boolean }> {
  const m = await requireAgency("manager");
  if (!z.uuid().safeParse(linkId).success) return { ok: false };
  return { ok: !!(await deleteDraft(m.agency.id, linkId)) };
}
