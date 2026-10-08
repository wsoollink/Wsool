/**
 * Username rules (CLAUDE.md sections 10 and 12).
 * Validation that uses these lives with the username claim step.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

/**
 * Every top-level route segment of the site, plus names that must never be a
 * creator page. ADD A NAME HERE WHENEVER A NEW TOP-LEVEL ROUTE IS CREATED.
 * Staff can block extra names in the reserved_usernames table.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Locales (internal route prefixes, see src/proxy.ts)
  "ar", "en",
  // Site routes
  "dashboard", "admin", "api", "auth", "login", "logout", "signin", "signup",
  "register", "onboarding", "settings", "account", "pricing", "plans",
  "billing", "checkout", "invoice", "invoices", "help", "support", "contact",
  "about", "terms", "privacy", "legal", "blog", "faq", "investor", "investors",
  "invest", "verify", "verification", "notifications", "analytics", "pdf",
  "mediakit", "kit", "callback", "oauth", "reset", "brand", "assets",
  "static", "public", "images", "fonts", "og", "embed", "explore", "search",
  "newsletter", "subscribe", "unsubscribe", "confirm", "suspended",
  "demo", "home", "new", "edit", "user", "users", "creator", "creators", "page",
  "pages", "templates", "status", "health", "robots", "sitemap", "manifest",
  "favicon", "_next", "_vercel",
  // Brand and infrastructure
  "wsool", "wsool.link", "wsoollink", "official", "team", "staff", "root",
  "system", "www", "mail", "email", "smtp", "cdn", "dev", "test", "staging",
  "null", "undefined", "me",
]);

/**
 * src/proxy.ts treats paths ending in these extensions as files, so a
 * username may not end with one (e.g. "ali.png"). Keep in sync with the
 * proxy matcher.
 */
export const ASSET_EXTENSIONS = [
  "ico", "png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "txt", "xml",
  "webmanifest", "json", "css", "js", "map", "woff", "woff2", "ttf", "otf", "pdf",
  "mp4", "webm", "mov", "m4v",
] as const;

/** A creator can change their username once every this many days. */
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export type UsernameFormatError = "length" | "characters" | "dots" | "reserved" | "extension";

/**
 * Pure format check (no database). Expects an already-normalized name
 * (see normalizeUsername). Shared by the browser hint and the server check.
 */
export function usernameFormatError(name: string): UsernameFormatError | null {
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return "length";
  if (!USERNAME_PATTERN.test(name)) return "characters";
  if (name.startsWith(".") || name.endsWith(".") || name.includes("..")) return "dots";
  if (RESERVED_USERNAMES.has(name)) return "reserved";
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if ((ASSET_EXTENSIONS as readonly string[]).includes(extension)) return "extension";
  return null;
}

/** Usernames are case-insensitive: always trim and lowercase before use. */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}
