// External
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

// App
import type { Bindings } from "@/env";

// Infrastructure
import { auth } from "@/infrastructure/auth";
import { buildOpenAPIDocument } from "@/infrastructure/openapi";

// Middleware
import { requireVerifiedApiKey } from "@/middleware/auth";
import { notFound, onError } from "@/middleware/errors";

const app = new OpenAPIHono<{ Bindings: Bindings }>();

app.notFound(notFound);
app.onError(onError);

app.use(
  "*",
  cors({
    origin: (_origin, c) => c.env.WEB_ORIGIN ?? c.env.API_ORIGIN,
    allowHeaders: ["Accept", "Content-Type", "X-API-Key", "Authorization"],
    credentials: true,
  }),
);
app.use(secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));

app.get("/healthz", (c) => c.json({ ok: true }));

// Docs - Swagger UI
app.get("/doc", async (c) => c.json(await buildOpenAPIDocument(app, c.env)));
app.get("/docs", swaggerUI({ url: "/doc" }));

// Better Auth routes
app.all("/api/auth/*", (c) => auth(c.env).handler(c.req.raw));

app.use("/api/v1/*", requireVerifiedApiKey);

export default app;
