"use server";

import { z } from "zod";
import { PERMISSIONS, ROLE_PRESETS } from "@/config/admin";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export type TeamResult = { ok?: boolean; error?: "failed" | "invalid_email" | "exists" | "owner_email" };

const roles = Object.keys(ROLE_PRESETS) as [keyof typeof ROLE_PRESETS, ...(keyof typeof ROLE_PRESETS)[]];
const memberSchema = z.object({
  role: z.enum(roles),
  permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length).transform((p) => [...new Set(p)]),
});

const isOwnerEmail = (email: string) =>
  (process.env.OWNER_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase()).includes(email);

/** Owner only: adds a staff member by email. They get access after signing in with that email. */
export async function inviteMember(email: string, role: string, permissions: string[]): Promise<TeamResult> {
  const admin = await requireAdmin("owner");
  const address = z.email().safeParse(String(email ?? "").trim().toLowerCase());
  if (!address.success) return { error: "invalid_email" };
  if (isOwnerEmail(address.data)) return { error: "owner_email" };
  const parsed = memberSchema.safeParse({ role, permissions });
  if (!parsed.success) return { error: "failed" };
  if (await db.adminMember.findUnique({ where: { email: address.data } })) return { error: "exists" };

  // Already has a Wsool account: link it now.
  const existing = await db.user.findUnique({ where: { email: address.data }, select: { id: true } });
  await db.$transaction(async (tx) => {
    const member = await tx.adminMember.create({
      data: { email: address.data, userId: existing?.id ?? null, role: parsed.data.role, permissions: parsed.data.permissions, invitedBy: admin.userId },
    });
    await audit(admin, "team.invite", { type: "admin_member", id: member.id }, { email: address.data, role: parsed.data.role, permissions: parsed.data.permissions }, tx);
  });
  // TODO(phase 6): invitation email.
  return { ok: true };
}

/** Owner only: changes a member's role, permissions or active state. */
export async function updateMember(id: string, role: string, permissions: string[], active: boolean): Promise<TeamResult> {
  const admin = await requireAdmin("owner");
  const parsed = memberSchema.safeParse({ role, permissions });
  const member = await db.adminMember.findUnique({ where: { id: String(id) } });
  if (!parsed.success || !member || member.role === "owner") return { error: "failed" };
  await db.$transaction(async (tx) => {
    await tx.adminMember.update({ where: { id: member.id }, data: { role: parsed.data.role, permissions: parsed.data.permissions, active: !!active } });
    await audit(admin, "team.update", { type: "admin_member", id: member.id }, {
      email: member.email,
      before: { role: member.role, permissions: member.permissions, active: member.active },
      after: { role: parsed.data.role, permissions: parsed.data.permissions, active: !!active },
    }, tx);
  });
  return { ok: true };
}

/** Owner only: removes a member (they lose access right away). */
export async function removeMember(id: string): Promise<TeamResult> {
  const admin = await requireAdmin("owner");
  const member = await db.adminMember.findUnique({ where: { id: String(id) } });
  if (!member || member.role === "owner") return { error: "failed" };
  await db.$transaction(async (tx) => {
    await tx.adminMember.delete({ where: { id: member.id } });
    await audit(admin, "team.remove", { type: "admin_member", id: member.id }, { email: member.email, role: member.role }, tx);
  });
  return { ok: true };
}
