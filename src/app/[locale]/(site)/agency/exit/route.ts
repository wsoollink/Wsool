import { NextResponse, type NextRequest } from "next/server";
import { ACT_COOKIE } from "@/lib/agency";

/** Leaves acting mode (the banner's "Back to agency"): clears the cookies and returns to the agency dashboard. */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/agency", req.nextUrl.origin), 303);
  res.cookies.delete(ACT_COOKIE);
  res.cookies.delete("wsool_act_nav");
  return res;
}
