"use server";

import { z } from "zod";
import { deactivateAgency } from "@/lib/agency";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendAgencyTeamInvite } from "@/lib/notify";

const input = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().pipe(z.email().max(254)) });

/** Owner only: opens an agency for the free beta, with its owner's email (they get an invitation email). */
export async function createAgency(name: string, email: string): Promise<{ ok?: true; error?: "invalid" | "exists" }> {
  const admin = await requireAdmin("owner");
  const parsed = input.safeParse({ name, email });
  if (!parsed.success) return { error: "invalid" };
  if (await db.agencyMember.count({ where: { email: parsed.data.email } })) return { error: "exists" };
  await db.$transaction(async (tx) => {
    const agency = await tx.agency.create({ data: { name: parsed.data.name, createdBy: admin.userId } });
    await tx.agencyMember.create({ data: { agencyId: agency.id, email: parsed.data.email, role: "owner" } });
    await audit(admin, "agency.create", { type: "agency", id: agency.id }, { name: parsed.data.name, email: parsed.data.email }, tx);
  });
  await sendAgencyTeamInvite(parsed.data.email, parsed.data.name);
  return { ok: true };
}

/** Owner only: stops an agency. Every linked creator keeps their page (and 14 days of Pro if the agency covered it). */
export async function stopAgency(id: string): Promise<{ ok?: true; error?: "invalid" }> {
  const admin = await requireAdmin("owner");
  if (!z.uuid().safeParse(id).success) return { error: "invalid" };
  const agency = await db.agency.findFirst({ where: { id, status: "active" } });
  if (!agency) return { error: "invalid" };
  await deactivateAgency(id);
  await audit(admin, "agency.deactivate", { type: "agency", id }, { name: agency.name });
  return { ok: true };
}
