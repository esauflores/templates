// External
import { createRoute, type RouteHandler, z } from "@hono/zod-openapi";

// App
import type { Bindings } from "@/env";

import { chunkSchema, questionBody } from "./schema";
import { retrieve } from "./store";

export const retrievalRoute = createRoute({
  method: "post",
  path: "/retrieval",
  tags: ["RAG"],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: questionBody },
      },
    },
  },
  responses: {
    200: {
      description: "Nearest chunks",
      content: { "application/json": { schema: z.object({ chunks: z.array(chunkSchema) }) } },
    },
    400: { description: "question required" },
    401: { description: "Unauthorized" },
  },
});

export const retrieval: RouteHandler<typeof retrievalRoute, { Bindings: Bindings }> = async (c) => {
  const { question, top_k } = c.req.valid("json");
  const chunks = await retrieve(c.env, question, top_k ?? 6);
  return c.json({ chunks });
};
