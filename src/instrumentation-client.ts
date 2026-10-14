import * as Sentry from "@sentry/nextjs";
import { SENTRY_OPTIONS } from "./sentry.shared";

/** Browser error reporting (Sentry), see src/sentry.shared.ts. No session replay. */
Sentry.init(SENTRY_OPTIONS);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
