/**
 * Where to go after signing in (owner audit, Nov 2026): a same-site path only ("/dashboard/subscription", never
 * "//evil.com" or "https://…"), not the login page itself. Anything else = null (→ the dashboard).
 */
export const NEXT_PARAM = "next";
export const NEXT_COOKIE = "wsool_next";
/** Request header the proxy adds with the visitor's real path (pages don't otherwise know it). */
export const PATH_HEADER = "x-wsool-path";

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || /[\s\\]/.test(value)) return null;
  if (/^\/(login|api\/auth)(\/|\?|$)/.test(value)) return null;
  return value;
}
