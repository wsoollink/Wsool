import { NextResponse } from "next/server";
import { REFERRAL, REF_COOKIE } from "@/config/referrals";
import { eligibleReferrer, recordReferralClick, refCookieValue } from "@/lib/referrals";

/**
 * Referral link landing: wsool.link/<path>?ref=<username> is sent here by the
 * proxy. Counts the click, remembers the creator for REFERRAL.cookieDays
 * (last click wins) and goes on to the page without the parameter.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/";
  // Same-site paths only (never "//host" or a full URL).
  const target = /^\/(?![/\\])/.test(next) ? next : "/";
  const res = NextResponse.redirect(new URL(target, url.origin), 307);
  res.headers.set("Cache-Control", "no-store");
  const username = url.searchParams.get("u") ?? "";
  const referrerId = await eligibleReferrer(username).catch(() => null);
  if (!referrerId) return res;
  await recordReferralClick(referrerId, req.headers).catch((err) => console.error("[referrals] click", err));
  res.cookies.set(REF_COOKIE, refCookieValue(referrerId), {
    maxAge: REFERRAL.cookieDays * 86400, path: "/", httpOnly: true, sameSite: "lax", secure: url.protocol === "https:",
  });
  return res;
}
