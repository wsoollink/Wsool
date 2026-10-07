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
  "home", "new", "edit", "user", "users", "creator", "creators", "page",
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
] as const;
