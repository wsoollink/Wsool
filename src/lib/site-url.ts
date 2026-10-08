/**
 * Public origin of the site, for absolute URLs (link previews, emails).
 * NEXT_PUBLIC_SITE_URL wins; Netlify sets URL automatically on deploys.
 */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000").replace(/\/$/, "");
}
