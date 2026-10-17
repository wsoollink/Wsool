import { z } from "zod";
import { ensureAccount } from "@/lib/account";
import { apiError, json, open, preflight, readBody, supabaseForApi } from "@/lib/mobile/api";
import { sessionPayload } from "@/lib/mobile/session";
import { ipFrom, rateLimit } from "@/lib/rate-limit";

const body = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(20).max(8000),
  /** Apple: the raw nonce whose SHA-256 was sent to Apple. */
  nonce: z.string().max(200).optional(),
});

/**
 * Native "Sign in with Google / Apple": the app gets an ID token from the
 * phone's own sign-in sheet; Supabase checks it (the provider must be enabled
 * in Supabase with the app's client ids) and returns a session.
 */
export const POST = open(async (req) => {
  const data = await readBody(req, body);
  if (!data) return apiError("invalid");
  if (!(await rateLimit(`idtoken-ip:${ipFrom(req.headers)}`, 30, 900))) return apiError("rate_limited", 429);
  const { data: res, error } = await supabaseForApi().auth.signInWithIdToken({ provider: data.provider, token: data.idToken, nonce: data.nonce });
  if (error || !res.session || !res.user?.email) return apiError("provider_failed", 400);
  await ensureAccount({ id: res.user.id, email: res.user.email.toLowerCase() });
  return json(sessionPayload(res.session));
});
export const OPTIONS = preflight;
