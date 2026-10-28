import { NextResponse } from "next/server";
import { PLATFORM_NAMES } from "@/config/platforms";
import { readSignedRequest } from "@/lib/connect/instagram";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

/**
 * Meta calls this when a creator removes Wsool from their Instagram settings (Business login settings → Deauthorize
 * callback URL). The link stops, like a revoked token: numbers stay, the creator is told and can link again.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const signed = readSignedRequest(form?.get("signed_request")?.toString());
  if (!signed) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const links = await db.platformConnection.findMany({
    where: { platform: "instagram", externalId: signed.userId, status: "active" },
    select: { id: true, account: { select: { handle: true, page: { select: { userId: true } } } } },
  });
  for (const c of links) {
    await db.platformConnection.update({ where: { id: c.id }, data: { status: "error", lastError: "deauthorized", lastSyncAt: new Date() } });
    await notify(c.account.page.userId, "connection_lost", { platform: PLATFORM_NAMES.instagram, handle: c.account.handle }, { dedupeKey: `connection_lost_${c.id}` });
  }
  return NextResponse.json({ ok: true });
}
