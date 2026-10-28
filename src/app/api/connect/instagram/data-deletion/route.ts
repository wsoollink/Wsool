import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { readSignedRequest } from "@/lib/connect/instagram";
import { requestOrigin } from "@/lib/connect";
import { db } from "@/lib/db";
import { expirePage } from "@/lib/public-page";

const codeFor = (userId: string) => createHmac("sha256", `${process.env.INSTAGRAM_APP_SECRET}:ig-deletion`).update(userId).digest("hex").slice(0, 16);

/**
 * Meta's data deletion callback (Business login settings → Data deletion request URL): the creator asked Instagram to
 * delete what Wsool got from it. We delete the link (its token) and the audience it filled; the creator's own page
 * content (handle, follower number they show) stays theirs to edit or delete. Answers with a status URL + code.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const signed = readSignedRequest(form?.get("signed_request")?.toString());
  if (!signed) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const links = await db.platformConnection.findMany({
    where: { platform: "instagram", externalId: signed.userId },
    select: { id: true, accountId: true, account: { select: { page: { select: { username: true } } } } },
  });
  for (const c of links) {
    await db.$transaction([
      db.platformConnection.delete({ where: { id: c.id } }),
      db.audienceData.deleteMany({ where: { accountId: c.accountId } }),
    ]);
    expirePage(c.account.page.username);
  }
  const code = codeFor(signed.userId);
  return NextResponse.json({ url: `${requestOrigin(req)}/api/connect/instagram/data-deletion?code=${code}`, confirmation_code: code });
}

/** Status page Meta links the creator to. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  if (!/^[0-9a-f]{16}$/.test(code)) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(
    `Wsool: the data we received from your Instagram account has been deleted (confirmation ${code}).\nوصول: حذفنا البيانات اللي وصلتنا من حساب Instagram حقك.`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
