"use server";

import { z } from "zod";
import { AGENCY_PAID_PLANS } from "@/config/agency-plans";
import { getAdmin } from "@/lib/admin";
import { requireAgency } from "@/lib/agency";
import { setAgencyAutoRenew, setAgencyNextPlan, startAgencyCheckout, type AgencyCheckoutError } from "@/lib/agency-billing";
import { paymentProvider } from "@/lib/payments";

/** Agency plan payment (owner, Nov 2026): owners and managers only. Prices come from config, never the browser. */
const plan = z.enum(AGENCY_PAID_PLANS);
const cycle = z.enum(["monthly", "yearly"]);

export async function agencyCheckout(planInput: string, cycleInput: string, lang: string): Promise<{ url: string } | { error: AgencyCheckoutError }> {
  const m = await requireAgency("manager");
  const p = plan.safeParse(planInput), c = cycle.safeParse(cycleInput);
  if (!p.success || !c.success) return { error: "failed" };
  // The test provider is for the team only, so no agency gets a plan for free.
  if (paymentProvider()?.testOnly && !(await getAdmin())) return { error: "disabled" };
  // Arabic site in SAR, English in USD (CLAUDE.md section 3).
  return startAgencyCheckout(m.user, m.agency.id, p.data, c.data, lang === "en" ? "USD" : "SAR");
}

export async function agencyAutoRenew(on: boolean): Promise<{ ok: boolean }> {
  const m = await requireAgency("manager");
  return { ok: await setAgencyAutoRenew(m.agency.id, !!on) };
}

/** Plan / cycle for the next renewal (e.g. move to the smaller plan or to yearly). */
export async function agencyNextPlan(planInput: string, cycleInput: string): Promise<{ ok: boolean }> {
  const m = await requireAgency("manager");
  const p = plan.safeParse(planInput), c = cycle.safeParse(cycleInput);
  if (!p.success || !c.success) return { ok: false };
  return { ok: await setAgencyNextPlan(m.agency.id, p.data, c.data) };
}
