import { z } from "zod";
import { apiError, json, open, preflight, readBody, supabaseForApi } from "@/lib/mobile/api";
import { sessionPayload } from "@/lib/mobile/session";

const body = z.object({ refreshToken: z.string().min(10).max(2000) });

/** Swaps a refresh token for a new session (Supabase rotates refresh tokens). */
export const POST = open(async (req) => {
  const data = await readBody(req, body);
  if (!data) return apiError("invalid", 400);
  const { data: res, error } = await supabaseForApi().auth.refreshSession({ refresh_token: data.refreshToken });
  if (error || !res.session) return apiError("unauthorized", 401);
  return json(sessionPayload(res.session));
});
export const OPTIONS = preflight;
