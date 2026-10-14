/**
 * Error reporting (Sentry). Off unless NEXT_PUBLIC_SENTRY_DSN is set (Netlify env;
 * the DSN is public by design). Privacy: no IP addresses, cookies, request bodies
 * or screen recordings are sent; only the error, where it happened and the page URL.
 */
export const SENTRY_OPTIONS = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  // A small sample of performance traces (free plan quota).
  tracesSampleRate: 0.05,
};
