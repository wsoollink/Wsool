import { z } from "zod";
import { newNonce, ownAccount, providerFor, seal } from "@/lib/connect";
import { apiError, json, preflight, readBody, withPage } from "@/lib/mobile/api";
import { siteOrigin } from "@/lib/site-url";

const body = z.object({ accountId: z.uuid() });

/** App: a one-time, 2-minute link that starts the platform's sign-in in the phone's browser (returns to wsool://connect). */
export const POST = withPage(async ({ user, req }) => {
  const platform = new URL(req.url).pathname.split("/").pop() ?? "";
  const provider = providerFor(platform);
  const data = await readBody(req, body);
  if (!provider || !data) return apiError("unavailable");
  const account = await ownAccount(user.id, data.accountId);
  if (!account || account.platform !== provider.platform) return apiError("not_found", 404);
  // One use, 2 minutes: a link someone else is lured into opening can't tie their channel to this account later.
  const ticket = seal({ userId: user.id, accountId: account.id, platform: provider.platform, source: "app", id: newNonce() }, 120);
  return json({ url: `${siteOrigin()}/api/connect/${provider.platform}/start?t=${encodeURIComponent(ticket)}` });
});
export const OPTIONS = preflight;
