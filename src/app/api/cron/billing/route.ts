import { timingSafeEqual } from "node:crypto";
import { purgeDeletedAccounts } from "@/lib/account-deletion";
import { runBillingJob } from "@/lib/billing";

/**
 * Hourly job (billing + permanent deletion after the 30-day undo window), called by the Netlify scheduled function
 * (netlify/functions/billing-cron.mts) with "Authorization: Bearer CRON_SECRET".
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const report = await runBillingJob();
  const purged = await purgeDeletedAccounts();
  return Response.json({ ...report, purged });
}
