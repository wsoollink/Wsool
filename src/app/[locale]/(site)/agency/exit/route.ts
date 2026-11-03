import { NextResponse, type NextRequest } from "next/server";
import { ACT_COOKIE, ACT_NAV_COOKIE, getMembership } from "@/lib/agency";

/**
 * Leaves acting mode (the banner's "Back to agency", or a link that ended): clears the cookies and returns to the
 * agency dashboard, or to the person's own dashboard when they're no longer on an agency team.
 */
export async function GET(req: NextRequest) {
  const member = await getMembership();
  const res = NextResponse.redirect(new URL(member ? "/agency" : "/dashboard", req.nextUrl.origin), 303);
  res.cookies.delete(ACT_COOKIE);
  res.cookies.delete(ACT_NAV_COOKIE);
  return res;
}
