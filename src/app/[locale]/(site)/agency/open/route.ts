import { NextResponse, type NextRequest } from "next/server";
import { normalizeUsername } from "@/config/usernames";
import { getMembership } from "@/lib/agency";
import { db } from "@/lib/db";
import { recordOpen } from "@/lib/directory";

/** Opens a listed creator's page from the directory and counts it for the creator's directory stats. Members only. */
export async function GET(req: NextRequest) {
  const m = await getMembership();
  if (!m) return new NextResponse("Not found", { status: 404 });
  const username = normalizeUsername(req.nextUrl.searchParams.get("u") ?? "").slice(0, 20);
  const page = username ? await db.page.findFirst({ where: { username, inDirectory: true, isPublished: true, deletedAt: null }, select: { id: true } }) : null;
  if (!page) return new NextResponse("Not found", { status: 404 });
  await recordOpen(page.id).catch(() => {});
  return NextResponse.redirect(new URL(`/${username}`, req.nextUrl.origin), 303);
}
