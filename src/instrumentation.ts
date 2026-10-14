import * as Sentry from "@sentry/nextjs";
import { SENTRY_OPTIONS } from "./sentry.shared";

/** Server / edge error reporting (Sentry), see src/sentry.shared.ts. */
export function register() {
  Sentry.init(SENTRY_OPTIONS);
}

// Errors thrown while rendering pages, route handlers and server actions.
export const onRequestError = Sentry.captureRequestError;
