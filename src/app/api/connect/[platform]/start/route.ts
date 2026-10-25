import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callbackUrl, newNonce, NONCE_COOKIE, ownAccount, providerFor, requestOrigin, seal, unseal, type Flow } from "@/lib/connect";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Starts linking a platform account (src/lib/connect). Web: ?account=<id> with the signed-in session.
 * App: ?t=<ticket> from POST /api/mobile/v1/connect/<platform> (the app's browser has no session cookie).
 * Sets a one-time nonce cookie, then sends the browser to the platform's consent screen.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const provider = providerFor(platform);
  const origin = requestOrigin(req);
  const back = (code: string) => NextResponse.redirect(`${origin}/dashboard/accounts?connect_error=${code}`);
  if (!provider) return back("unavailable");

  const q = req.nextUrl.searchParams;
  let flow: Flow | null = null;
  const ticket = unseal(q.get("t"));
  if (ticket && ticket.platform === platform && ticket.source === "app" && ticket.id) {
    // A ticket starts one sign-in only.
    if (!(await rateLimit(`connect-ticket:${ticket.id}`, 1, 300))) return back("expired");
    flow = ticket;
  }
  else {
    const user = await getCurrentUser();
    const accountId = q.get("account") ?? "";
    if (!user) return NextResponse.redirect(`${origin}/login`);
    flow = { userId: user.id, accountId, platform: provider.platform, source: "web" };
  }
  const account = await ownAccount(flow.userId, flow.accountId);
  if (!account || account.platform !== provider.platform) return back("gone");

  const nonce = newNonce();
  const res = NextResponse.redirect(provider.authUrl(seal({ ...flow, nonce }, 900), callbackUrl(origin, provider.platform)));
  res.cookies.set(NONCE_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/connect", maxAge: 900 });
  return res;
}
