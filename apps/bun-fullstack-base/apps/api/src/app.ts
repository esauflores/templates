import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { except } from "hono/combine";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { notFound, onError } from "@api/core/errors.ts";
import { apiRateLimit, rateLimit } from "@api/core/rate-limit.ts";
import { helloRoutes } from "@api/modules/hello/hello.routes.ts";
import { notesRoutes } from "@api/modules/notes/notes.routes.ts";

/** The largest request body the API reads; raise it for uploads, or give one route a bodyLimit of its own. */
const MAX_BODY_BYTES = 1024 * 1024;

/**
 * The API, everything under /api. It's on the web app's origin (server.ts puts both on one port), so no CORS.
 * The routes are chained so the returned type carries every one of them, for the web app's typed client.
 * Each request is logged (`<-- GET /api/hello/world`, then `--> … 200 3ms`), except /health.
 * Each client gets RATE_LIMIT requests a minute (300 by default, 0 for no limit), /health aside; stricter routes add
 * their own `rateLimit`.
 * A request body over MAX_BODY_BYTES answers `413 { error }`, from its Content-Length before anything reads it, or
 * as soon as a chunked one passes it.
 */
export function createApp() {
  const app = new OpenAPIHono().basePath("/api");

  app.notFound(notFound);
  app.onError(onError);
  app.use(except("/api/health", logger()));
  app.use(secureHeaders());
  const limit = apiRateLimit();
  if (limit > 0) app.use(rateLimit({ limit, windowMs: 60_000, skip: (c) => c.req.path === "/api/health" }));
  app.use(bodyLimit({ maxSize: MAX_BODY_BYTES, onError: tooLarge }));
  app.doc31("/openapi.json", { openapi: "3.1.0", info: { title: "API", version: "0.1.0" } });

  return app
    .get("/health", (c) => c.json({ ok: true }))
    .route("/", helloRoutes)
    .route("/", notesRoutes);
}

/** A body over MAX_BODY_BYTES, answered `413 { error }` by core/errors.ts like any other error. */
function tooLarge(): never {
  throw new HTTPException(413, { message: "The request body is over 1 MB" });
}

/** The API's routes and their types, for the web app's client (`hc<AppType>`, through client.ts). */
export type AppType = ReturnType<typeof createApp>;
