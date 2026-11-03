"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { ACT_COOKIE, ACT_NAV_COOKIE, endLink, inviteCreator, requireAgency, roleAtLeast, type InviteError } from "@/lib/agency";
import { db } from "@/lib/db";
import { sendAgencyTeamInvite } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";

const perms = z.object({ content: z.boolean(), rates: z.boolean(), contact: z.boolean() });

/** Invite a creator who already has a Wsool page (managers and the owner). */
export async function inviteCreatorAction(query: string, p: z.input<typeof perms>): Promise<{ ok?: true; error?: InviteError | "invalid" | "rate" }> {
  const m = await requireAgency("manager");
  // Brand accounts only search the directory; managing creators is for agencies.
  if (m.agency.kind !== "agency") return { error: "invalid" };
  const q = z.string().trim().min(3).max(254).safeParse(query);
  const pp = perms.safeParse(p);
  if (!q.success || !pp.success) return { error: "invalid" };
  if (!(await rateLimit(`agency-invite:${m.agency.id}`, 60, 3600))) return { error: "rate" };
  const res = await inviteCreator(m, q.data, pp.data);
  return "ok" in res ? { ok: true } : res;
}

export async function cancelInvite(linkId: string) {
  const m = await requireAgency("manager");
  if (!z.uuid().safeParse(linkId).success) return { error: "invalid" };
  const { count } = await db.agencyLink.updateMany({ where: { id: linkId, agencyId: m.agency.id, status: "pending" }, data: { status: "cancelled", decidedAt: new Date() } });
  return count ? { ok: true } : { error: "invalid" };
}

export async function removeCreator(linkId: string) {
  const m = await requireAgency("manager");
  if (!z.uuid().safeParse(linkId).success) return { error: "invalid" };
  return (await endLink(linkId, "agency", { agencyId: m.agency.id })) ? { ok: true } : { error: "invalid" };
}

/** Sections an agency member may open for a creator: drives the dashboard menu (the server checks every call anyway). */
function navFor(p: { canContent: boolean; canRates: boolean; canContact: boolean }) {
  return ["home", ...(p.canContent ? ["edit", "work", "links", "coupons"] : []), ...(p.canRates ? ["rates"] : []), ...(p.canContact ? ["contact"] : []), ...(p.canContent ? ["appearance"] : []), "analytics"].join(",");
}

/** "Manage": open the creator's dashboard in acting mode (editors and up). */
export async function manageCreator(linkId: string): Promise<{ url?: string; error?: string }> {
  const m = await requireAgency("editor");
  if (!z.uuid().safeParse(linkId).success) return { error: "invalid" };
  const link = await db.agencyLink.findFirst({ where: { id: linkId, agencyId: m.agency.id, status: "active" } });
  if (!link) return { error: "invalid" };
  const jar = await cookies();
  const opts = { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12 };
  jar.set(ACT_COOKIE, link.id, { ...opts, httpOnly: true });
  jar.set(ACT_NAV_COOKIE, navFor(link), opts);
  return { url: "/dashboard" };
}

const memberInput = z.object({ email: z.string().trim().toLowerCase().pipe(z.email().max(254)), role: z.enum(["manager", "editor", "viewer"]) });

/** Team: invite by email (managers and the owner). The person joins on their first sign-in with that email. */
export async function inviteMember(email: string, role: string): Promise<{ ok?: true; error?: "invalid" | "exists" | "rate" }> {
  const m = await requireAgency("manager");
  const parsed = memberInput.safeParse({ email, role });
  if (!parsed.success) return { error: "invalid" };
  if (!(await rateLimit(`agency-team:${m.agency.id}`, 30, 3600))) return { error: "rate" };
  // One agency per person (phase 1).
  if (await db.agencyMember.count({ where: { email: parsed.data.email } })) return { error: "exists" };
  await db.agencyMember.create({ data: { agencyId: m.agency.id, email: parsed.data.email, role: parsed.data.role } });
  await sendAgencyTeamInvite(parsed.data.email, m.agency.name);
  return { ok: true };
}

export async function removeMember(memberId: string) {
  const m = await requireAgency("manager");
  if (!z.uuid().safeParse(memberId).success) return { error: "invalid" };
  const target = await db.agencyMember.findFirst({ where: { id: memberId, agencyId: m.agency.id } });
  // The owner stays; a manager can't remove another manager (only the owner can).
  if (!target || target.role === "owner" || target.id === m.member.id || (target.role === "manager" && !roleAtLeast(m.member.role, "owner"))) return { error: "invalid" };
  await db.agencyMember.delete({ where: { id: target.id } });
  return { ok: true };
}
