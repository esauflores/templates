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

/**
 * GET /health: `{ ok: true }` after a SELECT 1, so Docker's health check fails with the database. Uptime checks call it
 * every few seconds, so it's mounted before the logger and the rate limit: neither applies to it.
 */
export const healthRoutes = new Hono().get("/health", (c) => {
  db.get(sql`SELECT 1`);
  return c.json({ ok: true });
});

/**
 * The API, everything under /api, on the web app's origin (server.ts), so no CORS. Each module's router carries its
 * routes' types, for the web app's client (web/lib/api.ts), so mounting it is all a module needs here.
 * Hono's logger writes two lines a request (`<--` on arrival, `-->` when answered), so a request that hangs still
 * shows. Its cost is in the README's benchmark notes.
 */
export function createApp() {
  const { RATE_LIMIT, MAX_BODY_BYTES } = config();
  const app = new Hono().basePath("/api");

  app.notFound((c) => c.json({ error: "Not Found" }, 404));
  /**
   * Every error ends here (https://hono.dev/docs/api/exception). An HTTPException answers its ready-made response, or
   * `{ error: message }` with its status, so keep internals out of the message. Anything else is a bug: logged, 500.
   */
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
