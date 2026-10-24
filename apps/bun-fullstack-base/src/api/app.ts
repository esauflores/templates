import { swaggerUI } from "@hono/swagger-ui";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { config, VERSION } from "@/api/core/config.ts";
import { db } from "@/api/core/db.ts";
import { bodyLimit, rateLimit } from "@/api/core/limits.ts";
import { helloRoutes } from "@/api/hello/hello.routes.ts";
import { notesRoutes } from "@/api/notes/notes.routes.ts";

/** GET /health: `{ ok: true }` after a SELECT 1. Mounted before the logger and the rate limit, which don't apply. */
export const healthRoutes = new Hono().get("/health", (c) => {
  db.get(sql`SELECT 1`);
  return c.json({ ok: true });
});

/**
 * The API under /api, on the web app's origin, so no CORS. Each module's routes carry their types to the web app's
 * client (web/lib/api.ts), so mounting a module is all it takes here.
 */
export function createApp() {
  const { RATE_LIMIT, MAX_BODY_BYTES } = config();
  const app = new Hono().basePath("/api");

  app.notFound((c) => c.json({ error: "Not Found" }, 404));
  /** Every error ends here: an HTTPException keeps its status, anything else is logged and answered 500. */
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      if (err.res) return err.getResponse();
      return c.json({ error: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

  app.use(secureHeaders());
  /** Routes mounted before a middleware answer without it: Hono runs handlers in the order they're added. */
  app.route("/", healthRoutes);
  app.use(logger());
  if (RATE_LIMIT > 0) app.use(rateLimit({ limit: RATE_LIMIT, windowMs: 60_000 }));
  app.use(bodyLimit(MAX_BODY_BYTES));

  app.route("/", helloRoutes);
  app.route("/", notesRoutes);

  /**
   * The OpenAPI document, built from the mounted routes: their validated input (`validate`) on its own, their answers
   * where `describeRoute` declares them, and a 400 { error } on every route that validates input. /health and /docs
   * aren't in it.
   */
  app.get(
    "/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: { title: "API", version: VERSION, description: "The example API of the Bun fullstack base template." },
      },
      exclude: ["/api/health", "/api/docs"],
      defaultValidationErrorResponse: {
        description: "The input is invalid",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    }),
  );

  /** GET /docs: Swagger UI on that document, to read and try the API in the browser (its files come from jsDelivr). */
  app.get("/docs", swaggerUI({ url: "/api/openapi.json", title: "API" }));
  return app;
}
