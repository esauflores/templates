// External
import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, z } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

// Features
import { rag } from "@/features/rag/routes";
import { widgets } from "@/features/widgets/routes";

// Infrastructure
import { auth } from "@/infrastructure/auth";
import { db } from "@/infrastructure/db";
import { buildOpenAPIDocument } from "@/infrastructure/openapi";

// Library
import { createApp } from "@/lib/app";

// Middleware
import { requireAuth } from "@/middleware/auth";
import { ApiError, notFound, onError } from "@/middleware/errors";
import { requestLogger } from "@/middleware/logger";

// Sized for the largest legitimate request — a PDF upload to /api/v1/ingest.
// JSON endpoints are far smaller; this is only a DoS ceiling, not a validation rule.
const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 MB

const app = createApp();

app.notFound(notFound);
app.onError(onError);

app.use("*", requestId());
app.use("*", requestLogger);
app.use(
  "*",
  cors({
    origin: (_origin, c) => c.env.WEB_ORIGIN ?? c.env.API_ORIGIN,
    allowHeaders: ["Accept", "Content-Type", "X-API-Key", "Authorization"],
    credentials: true,
  }),
);
app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
app.use(
  "*",
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: () => {
      throw new ApiError(413, "payload_too_large", "Request body exceeds 25 MB");
    },
  }),
);

// Liveness — the process is up. Readiness — dependencies (the database) answer.
const healthzRoute = createRoute({
  method: "get",
  path: "/healthz",
  tags: ["Health"],
  responses: {
    200: { description: "ok", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
  },
});

app.openapi(healthzRoute, (c) => c.json({ ok: true }));

app.get("/readyz", async (c) => {
  try {
    await db(c.env).execute(sql`select 1`);
    return c.json({ ok: true });
  } catch (err) {
    console.error(err);
    return c.json({ ok: false }, 503);
  }
});

// Docs - Swagger UI
app.get("/doc", async (c) => c.json(await buildOpenAPIDocument(app, c.env)));
app.get("/docs", swaggerUI({ url: "/doc" }));

// Whoami — the verified identity, same shape for either provider. Registered
// before the Better Auth catch-all so it wins.
app.get("/api/auth/session", requireAuth, (c) => c.json({ userId: c.get("userId") }));

// Better Auth serves its own routes here; Clerk has none (its frontend SDK
// talks to Clerk directly), so under `AUTH_PROVIDER=clerk` this 404s.
app.all("/api/auth/*", (c) => {
  if (c.env.AUTH_PROVIDER === "clerk") return c.notFound();
  return auth(c.env).handler(c.req.raw);
});

// Protected API — provider-aware auth gate, `userId` set on the context.
app.use("/api/v1/*", requireAuth);
app.route("/api/v1", widgets);
app.route("/api/v1", rag);

export default app;
