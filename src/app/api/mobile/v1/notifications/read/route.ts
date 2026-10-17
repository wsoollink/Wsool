import { z } from "zod";
import { apiError, authed, json, preflight, readBody } from "@/lib/mobile/api";
import { db } from "@/lib/db";

const body = z.object({ id: z.uuid().optional(), all: z.boolean().optional() });

/** Marks one notification (id) or all of them (all: true) as read. */
export const POST = authed(async ({ user, req }) => {
  const data = await readBody(req, body);
  if (!data || (!data.id && !data.all)) return apiError("invalid");
  await db.notification.updateMany({ where: { userId: user.id, readAt: null, ...(data.id && { id: data.id }) }, data: { readAt: new Date() } });
  return json({ ok: true });
});
export const OPTIONS = preflight;
