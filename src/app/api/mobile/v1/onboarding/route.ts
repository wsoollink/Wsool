import { z } from "zod";
import { apiError, authed, json, preflight, readBody } from "@/lib/mobile/api";
import { claimPage } from "@/lib/onboarding";

const body = z.object({ username: z.string().max(40) });

/** Claims the username and creates the page (first time only). */
export const POST = authed(async ({ user, req }) => {
  const data = await readBody(req, body);
  if (!data) return apiError("invalid");
  const res = await claimPage(user, data.username);
  if ("ok" in res) return json({ ok: true, username: res.name });
  return apiError(res.error, res.error === "suspended" ? 403 : res.error === "has_page" ? 409 : 400, { name: res.name });
});
export const OPTIONS = preflight;
