// External
import { type ClerkClient, createClerkClient } from "@clerk/backend";

// App
import type { Bindings } from "@/env";

/**
 * Clerk backend client. Used only when `AUTH_PROVIDER=clerk` — verifies the
 * Bearer token on `/api/v1/*` (a session JWT or a Clerk API key). There are no
 * routes to mount: Clerk's frontend SDK talks to Clerk directly.
 */
export const clerk = (env: Bindings): ClerkClient =>
  createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
