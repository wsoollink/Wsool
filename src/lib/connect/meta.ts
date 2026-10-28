import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_NAMES } from "@/config/platforms";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { expirePage } from "@/lib/public-page";

/**
 * Meta's callbacks for Instagram and Threads (owner, Oct 2026): "deauthorize/uninstall" (the creator removed Wsool in the
 * platform's settings) and "data deletion" (they asked the platform to delete what we got). Both POST a signed_request:
 * "<sig>.<payload>" (base64url), HMAC-SHA256 with that platform's app secret.
 */
export function readSignedRequest(signed: string | null | undefined, secret: string | undefined): { userId: string } | null {
  const [sig, payload] = String(signed ?? "").split(".");
  if (!secret || !sig || !payload) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user_id?: string | number; algorithm?: string };
    if (String(data.algorithm ?? "").toUpperCase() !== "HMAC-SHA256" || !data.user_id) return null;
    return { userId: String(data.user_id) };
  } catch {
    return null;
  }
}

/** The link stops, like a revoked token: numbers stay, the creator is told and can link again. */
export async function deauthorized(platform: Platform, externalId: string) {
  const links = await db.platformConnection.findMany({
    where: { platform, externalId, status: "active" },
    select: { id: true, account: { select: { handle: true, page: { select: { userId: true } } } } },
  });
  for (const c of links) {
    await db.platformConnection.update({ where: { id: c.id }, data: { status: "error", lastError: "deauthorized", lastSyncAt: new Date() } });
    await notify(c.account.page.userId, "connection_lost", { platform: PLATFORM_NAMES[platform], handle: c.account.handle }, { dedupeKey: `connection_lost_${c.id}` });
  }
}

/** Deletes the link (its token) and the audience it filled; the creator's own page content stays theirs. */
export async function deleteLinkedData(platform: Platform, externalId: string) {
  const links = await db.platformConnection.findMany({
    where: { platform, externalId },
    select: { id: true, accountId: true, account: { select: { page: { select: { username: true } } } } },
  });
  for (const c of links) {
    await db.$transaction([
      db.platformConnection.delete({ where: { id: c.id } }),
      db.audienceData.deleteMany({ where: { accountId: c.accountId } }),
    ]);
    expirePage(c.account.page.username);
  }
}

/** Confirmation code for a deletion request (stable per platform account, nothing stored). */
export const deletionCode = (platform: Platform, externalId: string, secret: string) =>
  createHmac("sha256", `${secret}:${platform}-deletion`).update(externalId).digest("hex").slice(0, 16);

/** Route handlers for one platform: POST deauthorize, POST data deletion, GET deletion status. */
export function metaCallbacks(platform: Platform, secret: () => string | undefined) {
  const read = async (req: Request) => readSignedRequest((await req.formData().catch(() => null))?.get("signed_request")?.toString(), secret());
  const name = PLATFORM_NAMES[platform];
  return {
    async deauthorize(req: Request) {
      const signed = await read(req);
      if (!signed) return Response.json({ error: "bad_request" }, { status: 400 });
      await deauthorized(platform, signed.userId);
      return Response.json({ ok: true });
    },
    async deletion(req: Request, origin: string) {
      const signed = await read(req);
      if (!signed) return Response.json({ error: "bad_request" }, { status: 400 });
      await deleteLinkedData(platform, signed.userId);
      const code = deletionCode(platform, signed.userId, secret()!);
      return Response.json({ url: `${origin}/api/connect/${platform}/data-deletion?code=${code}`, confirmation_code: code });
    },
    status(req: Request) {
      const code = new URL(req.url).searchParams.get("code") ?? "";
      if (!/^[0-9a-f]{16}$/.test(code)) return new Response("Not found", { status: 404 });
      return new Response(
        `Wsool: the data we received from your ${name} account has been deleted (confirmation ${code}).\nوصول: حذفنا البيانات اللي وصلتنا من حساب ${name} حقك.`,
        { headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    },
  };
}
