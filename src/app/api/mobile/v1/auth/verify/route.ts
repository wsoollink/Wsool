import { z } from "zod";
import { ensureAccount } from "@/lib/account";
import { apiError, json, open, preflight, readBody, supabaseForApi } from "@/lib/mobile/api";
import { isReviewEmail, reviewSession } from "@/lib/mobile/review-login";
import { sessionPayload } from "@/lib/mobile/session";
import { ipFrom, rateLimit } from "@/lib/rate-limit";

const body = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  code: z.string().trim().regex(/^\d{6,10}$/),
});

/** Sign-in step 2 (app): checks the code, creates the account on first sign-in, returns the session. */
export const POST = open(async (req) => {
  const data = await readBody(req, body);
  if (!data) return apiError("invalid_code");
  if (!(await rateLimit(`verify:${data.email}`, 10, 900)) || !(await rateLimit(`verify-ip:${ipFrom(req.headers)}`, 30, 900))) return apiError("rate_limited", 429);
  if (isReviewEmail(data.email)) {
    const review = await reviewSession(data.email, data.code);
    if (!review) return apiError("invalid_code");
    await ensureAccount({ id: review.userId, email: data.email });
    return json(sessionPayload(review.session));
  }
  const { data: res, error } = await supabaseForApi().auth.verifyOtp({ email: data.email, token: data.code, type: "email" });
  if (error || !res.session || !res.user) return apiError(error?.status === 429 ? "rate_limited" : "invalid_code", error?.status === 429 ? 429 : 400);
  await ensureAccount({ id: res.user.id, email: (res.user.email ?? data.email).toLowerCase() });
  return json(sessionPayload(res.session));
});
export const OPTIONS = preflight;
