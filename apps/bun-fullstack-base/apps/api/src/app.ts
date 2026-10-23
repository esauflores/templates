import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";

import { db } from "@api/core/db.ts";
import { notFound, onError } from "@api/core/errors.ts";
import { requestLogger } from "@api/core/logger.ts";
import { apiRateLimit, rateLimit, trustProxy } from "@api/core/rate-limit.ts";
import { helloRoutes } from "@api/modules/hello/hello.routes.ts";
import { notesRoutes } from "@api/modules/notes/notes.routes.ts";

/**
 * The largest request body the API reads: `MAX_BODY_BYTES`, in bytes, 1 MB when unset. Anything else fails at start,
 * as with the other settings. Raise it for uploads, or give one route a `bodyLimit` of its own.
 */
function maxBodyBytes(): number {
  const value = process.env.MAX_BODY_BYTES || String(1024 * 1024);
  if (!/^\d+$/.test(value) || Number(value) === 0) {
    throw new Error(`MAX_BODY_BYTES must be a whole number of bytes, got "${value}"`);
  }
  return Number(value);
}

/**
 * The API, everything under /api. It's on the web app's origin (server.ts puts both on one port), so no CORS.
 * The routes are chained so the returned type carries every one of them, for the web app's typed client.
 * Each request is logged once answered (`GET /api/hello/world 200 3ms`), except /health, which also reads the database
 * (a SELECT 1) and answers 500 when it can't: Docker's health check then sees the container as unhealthy too.
 * Each client gets RATE_LIMIT requests a minute (300 by default, 0 for no limit), /health aside; stricter routes add
 * their own `rateLimit`.
 * A request body over the limit answers `413 { error }`, from its Content-Length before anything reads it, or as soon
 * as a chunked one passes it.
 */
export function createApp() {
  const app = new OpenAPIHono().basePath("/api");

  app.notFound(notFound);
  app.onError(onError);
  app.use(requestLogger({ skip: ["/api/health"] }));
  app.use(secureHeaders());
  const limit = apiRateLimit();
  if (limit > 0) app.use(rateLimit({ limit, windowMs: 60_000, skip: (c) => c.req.path === "/api/health" }));
  const bodyBytes = maxBodyBytes();
  app.use(bodyLimit({ maxSize: bodyBytes, onError: () => tooLarge(bodyBytes) }));
  app.doc31("/openapi.json", { openapi: "3.1.0", info: { title: "API", version: "0.1.0" } });

  return app
    .get("/health", (c) => {
      db.get(sql`SELECT 1`);
      return c.json({ ok: true });
    })
    .route("/", helloRoutes)
    .route("/", notesRoutes);
}

/** A body over the limit, answered `413 { error }` by core/errors.ts like any other error. */
function tooLarge(maxBytes: number): never {
  throw new HTTPException(413, { message: `The request body is over ${maxBytes} bytes` });
}

/** The API's routes and their types, for the web app's client (`hc<AppType>`, through client.ts). */
export type AppType = ReturnType<typeof createApp>;

/** server.ts prints the proxy mode at start, from the setting the middleware reads. */
export { trustProxy };
