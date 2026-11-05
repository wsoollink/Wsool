import { timingSafeEqual } from "node:crypto";
import { purgeDeletedAccounts } from "@/lib/account-deletion";
import { runBillingJob } from "@/lib/billing";
import { runAgencyBillingJob } from "@/lib/agency-billing";
import { syncConnections } from "@/lib/connect";
import { ensureTelegramWebhook } from "@/lib/connect/telegram";
import { siteOrigin } from "@/lib/site-url";
import { purgeRateLimits } from "@/lib/rate-limit";
import { purgeAgencyRequests } from "@/lib/agency";
import { runReminders } from "@/lib/reminders";
import { cleanOrphanUploads } from "@/lib/storage-cleanup";

/**
 * Hourly job (billing, reminders, permanent deletion after the 30-day undo window, platform link updates), called by the Netlify scheduled function
 * (netlify/functions/billing-cron.mts) with "Authorization: Bearer CRON_SECRET".
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const report = await runBillingJob();
  // Agency plans: renewals, "plan ended" notices, creators unlinked 30 days after the end.
  const agencies = await runAgencyBillingJob().catch((err) => { console.error("[agency-billing]", err); return null; });
  const purged = await purgeDeletedAccounts();
  await purgeRateLimits();
  await purgeAgencyRequests();
  const reminders = await runReminders();
  // Linked platform accounts (YouTube…): followers + audience, once a day each.
  const connections = await syncConnections().catch((err) => ({ error: String(err) }));
  // Telegram's bot sends channel updates to this site (set once, checked hourly).
  await ensureTelegramWebhook(siteOrigin()).catch((err) => console.error("[telegram] webhook", err));
  // Uploaded files no row uses (once a day, a slice of the folders).
  const cleaned = await cleanOrphanUploads().catch((err) => { console.error("[storage-cleanup]", err); return 0; });
  return Response.json({ ...report, agencies, purged, reminders, connections, cleaned });
}
