import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limit backed by the `rate_limits` table (works across
 * serverless instances). Counts one hit for `key` and returns false once more
 * than `limit` hits happened within `windowSeconds`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key.slice(0, 200)}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
    RETURNING count`;
  return (rows[0]?.count ?? 1) <= limit;
}

/** Drops expired counters (hourly billing job). */
export async function purgeRateLimits() {
  await db.$executeRaw`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`;
}

/** The visitor's IP as Netlify reports it (set by Netlify, not by the browser). */
export function ipFrom(h: Headers): string {
  return h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** ipFrom() for server actions. */
export async function clientIp(): Promise<string> {
  return ipFrom(await headers());
}
