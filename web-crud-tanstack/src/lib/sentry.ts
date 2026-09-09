import * as Sentry from "@sentry/react";

import { env } from "#/env";

/**
 * Client-side error + performance reporting. No-ops without `VITE_SENTRY_DSN`,
 * so the template runs unconfigured. Server (Nitro) errors need `@sentry/node`
 * in a Nitro plugin — not wired here.
 */
export function initSentry(router: unknown): void {
  if (!env.VITE_SENTRY_DSN || typeof document === "undefined") return;
  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Add `Sentry.replayIntegration()` for session replay (heavier bundle).
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router as never)],
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
