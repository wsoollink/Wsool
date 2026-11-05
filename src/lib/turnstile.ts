import "server-only";
import { clientIp } from "@/lib/rate-limit";

// Local tests point TURNSTILE_VERIFY_URL at a fake server (the sandbox can't reach Cloudflare).
const VERIFY_URL = process.env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Server side of Cloudflare Turnstile (src/lib/turnstile-client.ts): checks a form's one-time token before the
 * server sends any email. Off (always true) without TURNSTILE_SECRET_KEY, so local runs and branch deploys without
 * the keys keep working. Fails closed: a missing, reused or wrong-action token, or Cloudflare not answering = false.
 */
export async function isHuman(token: unknown, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const ip = await clientIp();
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip !== "unknown" ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const out = (await res.json()) as { success?: boolean; action?: string; "error-codes"?: string[] };
    if (!out.success) console.warn("[turnstile] refused", action, out["error-codes"]);
    return out.success === true && out.action === action;
  } catch (e) {
    console.error("[turnstile] verify failed", e);
    return false;
  }
}
