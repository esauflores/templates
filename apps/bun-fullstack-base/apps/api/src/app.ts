import { OpenAPIHono } from "@hono/zod-openapi";
import { except } from "hono/combine";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { notFound, onError } from "@api/core/errors.ts";
import { rateLimit } from "@api/core/rate-limit.ts";
import { helloRoutes } from "@api/modules/hello/hello.routes.ts";

/**
 * The API, everything under /api. It's on the web app's origin (server.ts puts both on one port), so no CORS.
 * The routes are chained so the returned type carries every one of them, for the web app's typed client.
 * Each request is logged (`<-- GET /api/hello/world`, then `--> … 200 3ms`), except /health.
 * Each client gets 300 requests a minute, /health aside; stricter routes add their own `rateLimit`.
 */
export function createApp() {
  const app = new OpenAPIHono().basePath("/api");

  app.notFound(notFound);
  app.onError(onError);
  app.use(except("/api/health", logger()));
  app.use(secureHeaders());
  app.use(rateLimit({ limit: 300, windowMs: 60_000, skip: (c) => c.req.path === "/api/health" }));
  app.doc31("/openapi.json", { openapi: "3.1.0", info: { title: "API", version: "0.1.0" } });

  return app.get("/health", (c) => c.json({ ok: true })).route("/", helloRoutes);
}

/** The API's routes and their types, for the web app's client (`hc<AppType>` from hono/client). */
export type AppType = ReturnType<typeof createApp>;
