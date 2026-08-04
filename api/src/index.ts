// External
import { Hono } from "hono";
import { cors } from "hono/cors";

// App
import type { Bindings } from "@/env";

// Infrastructure
import { auth } from "@/infrastructure/auth";

// Middleware
import { requireVerifiedApiKey } from "@/middleware/auth";
import { notFound, onError } from "@/middleware/errors";

const app = new Hono<{ Bindings: Bindings }>();

app.notFound(notFound);
app.onError(onError);

app.use(
  "*",
  cors({
    origin: (_origin, c) => c.env.BETTER_AUTH_URL,
    allowHeaders: ["Accept", "Content-Type", "X-API-Key", "Authorization"],
    credentials: true,
  }),
);

app.get("/healthz", (c) => c.json({ ok: true }));

// Better Auth routes
app.all("/api/auth/*", (c) => auth(c.env).handler(c.req.raw));

app.use("/api/v1/*", requireVerifiedApiKey);

export default app;
