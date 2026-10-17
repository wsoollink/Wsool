import "server-only";
import { db } from "@/lib/db";

/**
 * Phone notifications for the mobile app through Expo's push service (it
 * forwards to Apple APNs / Google FCM). EXPO_ACCESS_TOKEN is optional (only
 * needed if "enhanced push security" is turned on in the Expo account).
 * Tokens Expo reports as no longer registered are deleted. Never throws.
 */
const EXPO_PUSH = process.env.EXPO_PUSH_URL || "https://exp.host/--/api/v2/push/send";

export const EXPO_TOKEN = /^Expo(nent)?PushToken\[[\w-]{10,100}\]$/;

export async function sendPush(userId: string, message: { title: string; body: string; href: string }) {
  try {
    const tokens = await db.pushToken.findMany({ where: { userId }, select: { token: true } });
    if (!tokens.length) return;
    const res = await fetch(EXPO_PUSH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", Accept: "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN && { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }),
      },
      body: JSON.stringify(tokens.map((t) => ({ to: t.token, title: message.title, body: message.body.slice(0, 300), sound: "default", data: { href: message.href } }))),
      signal: AbortSignal.timeout(8000),
    });
    const out = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
    const dead = (out?.data ?? []).map((r, i) => (r.status === "error" && r.details?.error === "DeviceNotRegistered" ? tokens[i]?.token : null)).filter((t): t is string => !!t);
    if (dead.length) await db.pushToken.deleteMany({ where: { token: { in: dead } } });
  } catch (err) {
    console.error("[push] failed", err);
  }
}
