import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS, type Permission } from "@/config/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type Admin = { userId: string; email: string; isOwner: boolean; permissions: Set<Permission> };

/** Owner email(s) from the OWNER_EMAIL env var (comma-separated, case-insensitive). */
function ownerEmails(): string[] {
  return (process.env.OWNER_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * The signed-in staff member, or null. The owner is whoever signs in with
 * OWNER_EMAIL (the email comes from the verified session). Invited members
 * are matched by email on their first visit and linked to their user id.
 */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const user = await getCurrentUser();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  if (ownerEmails().includes(email)) {
    return { userId: user.id, email, isOwner: true, permissions: new Set(PERMISSIONS) };
  }
  let member = await db.adminMember.findUnique({ where: { userId: user.id } });
  if (!member) {
    const invited = await db.adminMember.findUnique({ where: { email } });
    if (invited && !invited.userId) member = await db.adminMember.update({ where: { id: invited.id }, data: { userId: user.id } });
  }
  if (!member || !member.active || member.role === "owner") return null;
  const granted = Array.isArray(member.permissions) ? member.permissions : [];
  const permissions = new Set(PERMISSIONS.filter((p) => granted.includes(p)));
  return { userId: user.id, email, isOwner: false, permissions };
});

export function can(admin: Admin, permission: Permission | "owner") {
  return permission === "owner" ? admin.isOwner : admin.isOwner || admin.permissions.has(permission);
}

/**
 * For admin pages and actions. Signed-out → login; not staff or missing the
 * permission → 404, so the panel's existence isn't revealed.
 */
export async function requireAdmin(permission?: Permission | "owner"): Promise<Admin> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const admin = await getAdmin();
  if (!admin || (permission && !can(admin, permission))) notFound();
  return admin;
}

/** Writes one audit log row (who, what, when). Call it for every admin action. */
export async function audit(
  admin: Admin,
  action: string,
  target?: { type: string; id: string },
  details?: Prisma.InputJsonValue,
  tx: Pick<typeof db, "auditLog"> = db,
) {
  await tx.auditLog.create({
    data: { actorId: admin.userId, actorEmail: admin.email, action, targetType: target?.type, targetId: target?.id, details },
  });
}
