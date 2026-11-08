"use server";

import { z } from "zod";
import { AGENCY_PAID_PLANS } from "@/config/agency-plans";
import { getAdmin } from "@/lib/admin";
import { requireAgency } from "@/lib/agency";
import { redeemAgencyFreeCode, setAgencyAutoRenew, setAgencyNextPlan, startAgencyCheckout, type AgencyCheckoutError, type AgencyRedeemError } from "@/lib/agency-billing";
import { checkDiscountCode, type CodeError } from "@/lib/discounts";
import { paymentProvider } from "@/lib/payments";

/** Agency plan payment (owner, Nov 2026): owners and managers only. Prices come from config, never the browser. */
const plan = z.enum(AGENCY_PAID_PLANS);
const cycle = z.enum(["monthly", "yearly"]);

export async function agencyCheckout(planInput: string, cycleInput: string, lang: string, discountCode?: string): Promise<{ url: string } | { error: AgencyCheckoutError }> {
  const m = await requireAgency("manager");
  const p = plan.safeParse(planInput), c = cycle.safeParse(cycleInput);
  if (!p.success || !c.success) return { error: "failed" };
  // The test provider is for the team only, so no agency gets a plan for free.
  if (paymentProvider()?.testOnly && !(await getAdmin())) return { error: "disabled" };
  // Arabic site in SAR, English in USD (CLAUDE.md section 3).
  return startAgencyCheckout(m.user, m.agency.id, p.data, c.data, lang === "en" ? "USD" : "SAR", discountCode ? String(discountCode).slice(0, 30) : undefined);
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

/** "Have a discount code?" in the Subscription tab: checks an agency code for the member entering it (owner/manager). */
export async function applyAgencyDiscount(input: string): Promise<{ code: string; percent: number; freeCycle: "monthly" | "yearly" | null; freePlan: "starter" | "growth" | null } | { error: CodeError }> {
  const m = await requireAgency("manager");
  if (m.agency.kind !== "agency") return { error: "invalid" };
  const res = await checkDiscountCode(String(input ?? "").slice(0, 30), m.user, "agencies");
  return "error" in res ? res : { code: res.code, percent: res.percent, freeCycle: res.freeCycle, freePlan: res.freePlan };
}

/** Redeems a free (100%) agency code: the code's plan for its period, no payment (works while payments are off). */
export async function redeemAgencyFree(code: string): Promise<{ ok?: boolean; error?: AgencyRedeemError }> {
  const m = await requireAgency("manager");
  const res = await redeemAgencyFreeCode(m.user, m.agency.id, String(code ?? "").slice(0, 30));
  return "error" in res ? { error: res.error } : { ok: true };
}
