// External
import { OpenAPIHono } from "@hono/zod-openapi";

// App
import type { Bindings } from "@/env";

// Middleware
import { ApiError } from "@/middleware/errors";

/** Values set on the Hono context by middleware and read by handlers. */
export type Variables = {
  /** Correlation id for the request (also sent back as `X-Request-Id`). */
  requestId: string;
  /** The verified API key's owning user — set by `requireVerifiedApiKey`. */
  userId: string;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };

/**
 * An `OpenAPIHono` wired with the shared request-validation hook: a failed
 * `request.{query,params,json}` schema check becomes a `422 validation_error`
 * with per-field `details` instead of Hono's default plain-text 400.
 *
 * Use this for the root app and every feature sub-app so the error shape is
 * uniform (`defaultHook` is per-instance, not inherited through `app.route`).
 */
export const createApp = () =>
  new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) {
        throw new ApiError(
          422,
          "validation_error",
          "Request validation failed",
          result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        );
      }
    },
  });
