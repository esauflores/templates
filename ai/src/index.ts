// External
import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

// App
import type { Bindings } from "@/env";
import { chat, chatRoute } from "@/features/chat/chat";
import { ingest, ingestRoute } from "@/features/rag/ingest";
import { retrieval, retrievalRoute } from "@/features/rag/retrieval";
import { chunkCount } from "@/features/rag/store";

// Infrastructure
import { buildOpenAPIDocument, registerOpenAPI } from "@/infrastructure/openapi";

// Middleware
import { requireKey } from "@/middleware/auth";
import { notFound, onError } from "@/middleware/errors";

const app = new OpenAPIHono<{ Bindings: Bindings }>({
  defaultHook: (result) => {
    if (!result.success) {
      throw new HTTPException(400, { message: result.error.issues[0]?.message ?? "Bad Request" });
    }
  },
});

registerOpenAPI(app);

app.notFound(notFound);
app.onError(onError);

const healthzRoute = createRoute({
  method: "get",
  path: "/healthz",
  tags: ["Health"],
  responses: {
    200: {
      description: "ok",
      content: {
        "application/json": { schema: z.object({ ok: z.boolean(), chunks: z.number() }) },
      },
    },
  },
});

app.openapi(healthzRoute, (c) => c.json({ ok: true, chunks: chunkCount() }));

app.get("/doc", (c) => c.json(buildOpenAPIDocument(app)));
app.get("/docs", swaggerUI({ url: "/doc" }));

app.use("/ingest", requireKey);
app.use("/retrieval", requireKey);
app.use("/chat", requireKey);

app.openapi(ingestRoute, ingest);
app.openapi(retrievalRoute, retrieval);
app.openapi(chatRoute, chat);

export default app;
