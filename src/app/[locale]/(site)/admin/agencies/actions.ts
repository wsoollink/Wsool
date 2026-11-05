"use server";

import { z } from "zod";
import { deactivateAgency } from "@/lib/agency";
import { audit, requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { sendAgencyTeamInvite } from "@/lib/notify";
import { AGENCY_PLANS, AGENCY_TRIAL_DAYS } from "@/config/agency-plans";

const input = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  kind: z.enum(["agency", "brand"]),
});

/** Owner only: opens an agency (or a brand account that only searches the creator directory) for the free beta, with its owner's email (they get an invitation email). */
export async function createAgency(name: string, email: string, kind: "agency" | "brand" = "agency"): Promise<{ ok?: true; error?: "invalid" | "exists" }> {
  const admin = await requireAdmin("owner");
  const parsed = input.safeParse({ name, email, kind });
  if (!parsed.success) return { error: "invalid" };
  if (await db.agencyMember.count({ where: { email: parsed.data.email } })) return { error: "exists" };
  await db.$transaction(async (tx) => {
    const agency = await tx.agency.create({ data: { name: parsed.data.name, kind: parsed.data.kind, createdBy: admin.userId, planUntil: new Date(Date.now() + AGENCY_TRIAL_DAYS * 86_400_000) } });
    await tx.agencyMember.create({ data: { agencyId: agency.id, email: parsed.data.email, role: "owner" } });
    await audit(admin, "agency.create", { type: "agency", id: agency.id }, { name: parsed.data.name, email: parsed.data.email, kind: parsed.data.kind }, tx);
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

/** Owner only: opens the agency account from a "Join as an agency" request (same as the form above, then marks it done). */
export async function openFromRequest(id: string, kind: "agency" | "brand" = "agency"): Promise<{ ok?: true; error?: "invalid" | "exists" }> {
  await requireAdmin("owner");
  if (!z.uuid().safeParse(id).success) return { error: "invalid" };
  const req = await db.agencyRequest.findFirst({ where: { id, status: "new" } });
  if (!req) return { error: "invalid" };
  const res = await createAgency(req.agencyName, req.email, kind);
  if (res.ok) await db.agencyRequest.update({ where: { id }, data: { status: "opened", decidedAt: new Date() } });
  return res;
}

/** Owner only: closes a request without opening an account. */
export async function declineRequest(id: string): Promise<{ ok?: true; error?: "invalid" }> {
  const admin = await requireAdmin("owner");
  if (!z.uuid().safeParse(id).success) return { error: "invalid" };
  const req = await db.agencyRequest.findFirst({ where: { id, status: "new" } });
  if (!req) return { error: "invalid" };
  await db.$transaction(async (tx) => {
    await tx.agencyRequest.update({ where: { id }, data: { status: "declined", decidedAt: new Date() } });
    await audit(admin, "agency.decline_request", { type: "agency_request", id }, { name: req.agencyName, email: req.email }, tx);
  });
  return { ok: true };
}

const planInput = z.object({
  plan: z.enum(AGENCY_PLANS),
  cycle: z.enum(["monthly", "yearly"]).nullable(),
  /** yyyy-mm-dd (end of that day, Saudi time) or empty = no end date. */
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
});

/** Owner only: sets the agency's plan after it pays (no online payment for agencies yet). */
export async function setAgencyPlan(id: string, plan: string, cycle: string | null, until: string): Promise<{ ok?: true; error?: "invalid" }> {
  const admin = await requireAdmin("owner");
  const parsed = planInput.safeParse({ plan, cycle: plan === "trial" ? null : cycle, until });
  if (!z.uuid().safeParse(id).success || !parsed.success) return { error: "invalid" };
  const agency = await db.agency.findUnique({ where: { id }, select: { name: true } });
  if (!agency) return { error: "invalid" };
  const planUntil = parsed.data.until ? new Date(`${parsed.data.until}T23:59:59+03:00`) : null;
  await db.$transaction(async (tx) => {
    // Set by hand (custom deal, bank transfer, trial date): the card is no longer charged automatically.
    await tx.agency.update({ where: { id }, data: { plan: parsed.data.plan, planCycle: parsed.data.cycle, planUntil, planAutoRenew: false, planRetryAt: null, planFailedAttempts: 0 } });
    await audit(admin, "agency.plan", { type: "agency", id }, { name: agency.name, plan: parsed.data.plan, cycle: parsed.data.cycle ?? "", until: parsed.data.until }, tx);
  });
  return { ok: true };
}

/**
 * Owner only: permanently deletes a STOPPED agency (team, links, activity go with it), so its emails can be used again.
 * Creators' pages are never touched: their links already ended when the agency was stopped.
 */
export async function deleteAgency(id: string): Promise<{ ok?: true; error?: "invalid" }> {
  const admin = await requireAdmin("owner");
  if (!z.uuid().safeParse(id).success) return { error: "invalid" };
  const agency = await db.agency.findFirst({ where: { id, status: "inactive" } });
  if (!agency) return { error: "invalid" };
  await db.$transaction(async (tx) => {
    await tx.agency.delete({ where: { id } });
    await audit(admin, "agency.delete", { type: "agency", id }, { name: agency.name }, tx);
  });
  return { ok: true };
}
