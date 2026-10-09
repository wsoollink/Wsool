import { hasPro } from "@/config/plans";

/** Short plan label key for staff lists: pro (paid), trial, free. */
export function planLabel(sub: { status: string; trialEndsAt: Date | null } | null): "pro" | "trial" | "free" {
  if (sub?.status === "active" || sub?.status === "past_due") return "pro";
  return hasPro(sub) ? "trial" : "free";
}
