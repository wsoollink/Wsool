/**
 * Error reporting (Sentry). Off unless NEXT_PUBLIC_SENTRY_DSN is set (Netlify env;
 * the DSN is public by design). Privacy: no IP addresses, cookies, request bodies
 * or screen recordings are sent; only the error, where it happened and the page URL.
 */
type SentryEvent = { user?: { ip_address?: string | null } & Record<string, unknown> };

export const SENTRY_OPTIONS = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  // A small sample of performance traces (free plan quota).
  tracesSampleRate: 0.05,
  // A request cut off by the visitor's own connection or by leaving the page (Safari says "Load failed", Chrome
  // "Failed to fetch", Firefox "NetworkError…"): not a bug in the site, and nothing we can fix (owner, Nov 2026).
  ignoreErrors: [/^Load failed$/, /^Failed to fetch$/, /NetworkError when attempting to fetch resource/, /^The network connection was lost\.?$/],
  // Never keep the visitor's IP address, even when Sentry would fill it in (the privacy policy says so).
  beforeSend<E extends SentryEvent>(event: E): E {
    if (event.user) delete event.user.ip_address;
    event.user = { ...event.user, ip_address: null };
    return event;
  },
};
