// External
import { createRoute, type RouteHandler, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

// App
import type { Bindings } from "@/env";

import { boxesToDocuments } from "./chunk";
import { replaceIndex } from "./store";

// Infrastructure
import { ocrPdf } from "@/infrastructure/mistral";

export const ingestRoute = createRoute({
  method: "post",
  path: "/ingest",
  tags: ["RAG"],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().openapi({ type: "string", format: "binary" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Index replaced",
      content: {
        "application/json": { schema: z.object({ chunk_count: z.number(), pages: z.number() }) },
      },
    },
    400: { description: "multipart field file=PDF" },
    401: { description: "Unauthorized" },
    422: { description: "OCR returned no blocks" },
  },
});

export const ingest: RouteHandler<typeof ingestRoute, { Bindings: Bindings }> = async (c) => {
  if (!c.env.MISTRAL_API_KEY) {
    throw new HTTPException(500, { message: "MISTRAL_API_KEY is not set" });
  }

  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "multipart field file=PDF" });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ocr = await ocrPdf(c.env.MISTRAL_API_KEY, bytes, file.name || "book.pdf");
  const docs = boxesToDocuments(ocr);
  if (docs.length === 0) {
    throw new HTTPException(422, { message: "OCR returned no blocks. Need include_blocks (OCR 4+)." });
  }

  await replaceIndex(c.env, docs);
  const pages = Array.isArray((ocr as { pages?: unknown }).pages) ? (ocr as { pages: unknown[] }).pages.length : 0;
  return c.json({ chunk_count: docs.length, pages });
};
