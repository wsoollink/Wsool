import { z } from "zod";
import { validIban } from "@/lib/iban";

/** Affiliate payout settings (dashboard → Commission). A bank payout needs a valid IBAN and the holder's name. */
export const payoutSchema = z
  .object({
    method: z.enum(["credit", "bank"]),
    iban: z.string().trim().max(42).default(""),
    holderName: z.string().trim().max(100).default(""),
  })
  .transform((v, ctx) => {
    // The bank details are optional with "credit", but checked whenever they are filled in.
    const iban = v.iban ? validIban(v.iban) : null;
    if ((v.iban || v.method === "bank") && !iban) ctx.addIssue({ code: "custom", path: ["iban"], message: "iban" });
    if ((v.holderName || v.method === "bank") && v.holderName.length < 3) ctx.addIssue({ code: "custom", path: ["holderName"], message: "holderName" });
    return { method: v.method, iban, holderName: v.holderName || null };
  });
export type PayoutInput = z.input<typeof payoutSchema>;
