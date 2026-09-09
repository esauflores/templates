// External
import { createRoute, z } from "@hono/zod-openapi";

// Database
import type { RagDocument } from "@/db/schema";

// Infrastructure
import { complete, ocrPdf } from "@/infrastructure/mistral";
import { storage } from "@/infrastructure/storage";

// Library
import { createApp } from "@/lib/app";

// Middleware
import { ApiError } from "@/middleware/errors";

// Feature
import { buildChatMessages } from "@/features/chat/prompt";

import { boxesToDocuments } from "./chunk";
import { deleteDocument, getDocument, ingestDocument, listDocuments, retrieve } from "./store";

// --- Schemas -------------------------------------------------------------

const positionSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]);

const chunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  positions: z.array(positionSchema),
});

const questionBody = z.object({
  question: z.string().trim().min(1, "question is required"),
  top_k: z.number().int().positive().max(50).optional(),
});

const documentSchema = z
  .object({
    id: z.string(),
    filename: z.string(),
    pages: z.number().int(),
    chunkCount: z.number().int(),
    createdAt: z.string(),
  })
  .openapi("Document");

const IdParam = z.object({ id: z.string().uuid() });

const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({ content: { "application/json": { schema } } });

const serializeDoc = (d: RagDocument) => ({
  id: d.id,
  filename: d.filename,
  pages: d.pages,
  chunkCount: d.chunkCount,
  createdAt: d.createdAt.toISOString(),
});

// --- Routes -----------------------------------------------------------

export const rag = createApp();

rag.openapi(
  createRoute({
    method: "post",
    path: "/ingest",
    tags: ["RAG"],
    summary: "Upload a PDF (multipart field `file`) → OCR → a new document + its chunks",
    // The multipart body is parsed and checked in the handler (`parseBody` +
    // `instanceof File`); declaring a zod schema for a binary upload buys nothing.
    responses: {
      201: {
        description: "Document ingested",
        ...jsonBody(z.object({ documentId: z.string(), chunkCount: z.number(), pages: z.number() })),
      },
    },
  }),
  async (c) => {
    if (!c.env.MISTRAL_API_KEY) throw new ApiError(500, "config_error", "MISTRAL_API_KEY is not set");

    const file = (await c.req.parseBody()).file;
    if (!(file instanceof File)) throw new ApiError(400, "bad_request", "multipart field `file` must be a PDF");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const filename = file.name || "document.pdf";
    const ocr = await ocrPdf(c.env.MISTRAL_API_KEY, bytes, filename);
    const docs = boxesToDocuments(ocr);
    if (docs.length === 0) {
      throw new ApiError(422, "no_content", "OCR returned no usable blocks (needs include_blocks, OCR 4+)");
    }

    const ownerId = c.get("userId");
    const storageKey = `pdfs/${ownerId}/${crypto.randomUUID()}.pdf`;
    await storage(c.env).put(storageKey, bytes, "application/pdf");

    const pages = Array.isArray((ocr as { pages?: unknown }).pages) ? (ocr as { pages: unknown[] }).pages.length : 0;
    const { documentId, chunkCount } = await ingestDocument(c.env, ownerId, { filename, storageKey, pages }, docs);
    return c.json({ documentId, chunkCount, pages }, 201);
  },
);

rag.openapi(
  createRoute({
    method: "post",
    path: "/retrieval",
    tags: ["RAG"],
    summary: "Nearest chunks to a question",
    request: { body: jsonBody(questionBody) },
    responses: { 200: { description: "Nearest chunks", ...jsonBody(z.object({ chunks: z.array(chunkSchema) })) } },
  }),
  async (c) => {
    const { question, top_k } = c.req.valid("json");
    const chunks = await retrieve(c.env, c.get("userId"), question, top_k ?? 6);
    return c.json({ chunks }, 200);
  },
);

rag.openapi(
  createRoute({
    method: "post",
    path: "/chat",
    tags: ["RAG"],
    summary: "Answer a question grounded on retrieved chunks",
    request: { body: jsonBody(questionBody) },
    responses: {
      200: {
        description: "Grounded answer + the chunks it used",
        ...jsonBody(z.object({ answer: z.string(), chunks: z.array(chunkSchema) })),
      },
    },
  }),
  async (c) => {
    if (!c.env.MISTRAL_API_KEY) throw new ApiError(500, "config_error", "MISTRAL_API_KEY is not set");

    const { question, top_k } = c.req.valid("json");
    const chunks = await retrieve(c.env, c.get("userId"), question, top_k ?? 6);
    if (chunks.length === 0) throw new ApiError(422, "no_index", "Ingest a PDF before chatting");

    const answer = await complete(c.env.MISTRAL_API_KEY, buildChatMessages(question, chunks));
    return c.json({ answer, chunks }, 200);
  },
);

rag.openapi(
  createRoute({
    method: "get",
    path: "/documents",
    tags: ["RAG"],
    summary: "List the caller's ingested documents",
    responses: { 200: { description: "Documents", ...jsonBody(z.object({ items: z.array(documentSchema) })) } },
  }),
  async (c) => {
    const items = (await listDocuments(c.env, c.get("userId"))).map(serializeDoc);
    return c.json({ items }, 200);
  },
);

rag.openapi(
  createRoute({
    method: "get",
    path: "/documents/{id}",
    tags: ["RAG"],
    summary: "Get one document's metadata",
    request: { params: IdParam },
    responses: { 200: { description: "The document", ...jsonBody(documentSchema) } },
  }),
  async (c) => {
    const doc = await getDocument(c.env, c.get("userId"), c.req.valid("param").id);
    return c.json(serializeDoc(doc), 200);
  },
);

rag.openapi(
  createRoute({
    method: "delete",
    path: "/documents/{id}",
    tags: ["RAG"],
    summary: "Delete a document, its chunks, and its stored PDF",
    request: { params: IdParam },
    responses: { 204: { description: "Deleted" } },
  }),
  async (c) => {
    const key = await deleteDocument(c.env, c.get("userId"), c.req.valid("param").id);
    await storage(c.env).delete(key);
    return c.body(null, 204);
  },
);

// Plain route (returns a redirect, not JSON) — a short-lived link to the stored PDF.
rag.get("/documents/:id/pdf", async (c) => {
  const doc = await getDocument(c.env, c.get("userId"), c.req.param("id"));
  return c.redirect(await storage(c.env).url(doc.storageKey), 302);
});
