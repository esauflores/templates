// External
import { Hono } from "hono";

// App
import type { Bindings } from "@/env";

// Middleware
import { notFound, onError } from "@/middleware/errors";

// Routes
import { webhook } from "@/routes/webhook";

const app = new Hono<{ Bindings: Bindings }>();

app.notFound(notFound);
app.onError(onError);

app.get("/healthz", (c) => c.json({ ok: true }));

app.post("/webhook", webhook);

export default app;
