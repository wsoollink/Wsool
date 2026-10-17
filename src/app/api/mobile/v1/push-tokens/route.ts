import { z } from "zod";
import { apiError, authed, json, preflight, readBody } from "@/lib/mobile/api";
import { db } from "@/lib/db";
import { EXPO_TOKEN } from "@/lib/push";

const body = z.object({ token: z.string().regex(EXPO_TOKEN), platform: z.enum(["ios", "android"]).optional() });

/** Registers this phone for push notifications (a token moves to whoever signed in on that phone last). */
export const POST = authed(async ({ user, req }) => {
  const data = await readBody(req, body);
  if (!data) return apiError("invalid");
  await db.pushToken.upsert({
    where: { token: data.token },
    create: { userId: user.id, token: data.token, platform: data.platform ?? "ios" },
    update: { userId: user.id, platform: data.platform ?? "ios", lastSeenAt: new Date() },
  });
  return json({ ok: true });
});

/** Signing out on a phone: stop pushes to it. */
export const DELETE = authed(async ({ user, req }) => {
  const data = await readBody(req, body);
  if (!data) return apiError("invalid");
  await db.pushToken.deleteMany({ where: { token: data.token, userId: user.id } });
  return json({ ok: true });
});
export const OPTIONS = preflight;
