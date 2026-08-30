// External
import { createRoute, type RouteHandler, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

// App
import type { Bindings } from "@/env";
import { chunkSchema, questionBody } from "@/features/rag/schema";
import { retrieve } from "@/features/rag/store";

import { buildChatMessages } from "./prompt";

// Infrastructure
import { complete } from "@/infrastructure/mistral";

export const chatRoute = createRoute({
  method: "post",
  path: "/chat",
  tags: ["Chat"],
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
      description: "Answer grounded on retrieved chunks",
      content: {
        "application/json": {
          schema: z.object({ answer: z.string(), chunks: z.array(chunkSchema) }),
        },
      },
    },
    400: { description: "question required" },
    401: { description: "Unauthorized" },
    422: { description: "ingest a PDF first" },
  },
});

export const chat: RouteHandler<typeof chatRoute, { Bindings: Bindings }> = async (c) => {
  if (!c.env.MISTRAL_API_KEY) {
    throw new HTTPException(500, { message: "MISTRAL_API_KEY is not set" });
  }

  const { question, top_k } = c.req.valid("json");
  const chunks = await retrieve(c.env, question, top_k ?? 6);
  if (chunks.length === 0) {
    throw new HTTPException(422, { message: "ingest a PDF first" });
  }

  const answer = await complete(c.env.MISTRAL_API_KEY, buildChatMessages(question, chunks));
  return c.json({ answer, chunks });
};
