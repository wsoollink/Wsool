import { z } from "zod";
import { apiError, json, open, preflight, readBody, supabaseForApi } from "@/lib/mobile/api";
import { ipFrom, rateLimit } from "@/lib/rate-limit";

const body = z.object({ email: z.string().trim().toLowerCase().pipe(z.email().max(254)) });

/** Sign-in step 1 (app): emails a one-time code. Same limits as the website. */
export const POST = open(async (req) => {
  const data = await readBody(req, body);
  if (!data) return apiError("invalid_email");
  const ip = ipFrom(req.headers);
  if (!(await rateLimit(`otp-ip:${ip}`, 10, 3600)) || !(await rateLimit(`otp-email:${data.email}`, 5, 3600))) return apiError("rate_limited", 429);
  const { error } = await supabaseForApi().auth.signInWithOtp({ email: data.email, options: { shouldCreateUser: true } });
  if (error) return apiError(error.code === "email_address_invalid" ? "invalid_email" : error.status === 429 ? "rate_limited" : "failed", error.status === 429 ? 429 : 400);
  return json({ ok: true });
});
export const OPTIONS = preflight;
