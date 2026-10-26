import { NextResponse, type NextRequest } from "next/server";
import { callbackUrl, completeConnection, NONCE_COOKIE, requestOrigin, unseal, type ConnectError } from "@/lib/connect";

/** The platform sends the creator back here with a code (or an error). Then: back to the dashboard, or to the app. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const q = req.nextUrl.searchParams;
  const flow = unseal(q.get("state"));
  const cookieNonce = req.cookies.get(NONCE_COOKIE)?.value;
  const origin = requestOrigin(req);

  const finish = (result: { ok: true } | { error: ConnectError | "expired" }) => {
    const ok = "ok" in result;
    const web = `${origin}/dashboard/accounts?${ok ? `connected=${platform}` : `connect_error=${"error" in result ? result.error : "failed"}`}`;
    const app = `wsool://connect?${ok ? `status=ok&platform=${platform}` : `status=error&code=${"error" in result ? result.error : "failed"}`}`;
    const res = NextResponse.redirect(flow?.source === "app" ? app : web);
    res.cookies.delete({ name: NONCE_COOKIE, path: "/api/connect" });
    return res;
  };

  // Signed state for this platform + the same browser that started (nonce cookie): no one else's code lands here.
  if (!flow || flow.platform !== platform || !flow.nonce || flow.nonce !== cookieNonce) return finish({ error: "expired" });
  if (q.get("error")) return finish({ error: "denied" });
  const code = q.get("code");
  if (!code) return finish({ error: "failed" });
  return finish(await completeConnection(flow, code, callbackUrl(origin, flow.platform), q.get("state") ?? undefined));
}
