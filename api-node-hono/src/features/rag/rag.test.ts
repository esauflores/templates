// External
import { beforeEach, describe, expect, it, vi } from "vitest";

// App
import { testBindings } from "@/env";
import app from "@/index";

// Infrastructure
import { clearMemoryStorage } from "@/infrastructure/storage/memory";

// Test Utilities
import { makeVerifiedUserWithKey } from "@/helpers/test/better-auth";
import { resetDatabase } from "@/helpers/test/pglite";

// 1024-dim (mistral-embed width), non-zero so pgvector cosine distance is defined.
const fakeEmbedding = Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0));

vi.mock("@/infrastructure/mistral", () => ({
  embed: vi.fn(async (_key: string, texts: string[]) => texts.map(() => fakeEmbedding)),
  complete: vi.fn(async () => "An array is a contiguous sequence."),
  ocrPdf: vi.fn(async () => ({
    pages: [
      {
        index: 0,
        dimensions: { width: 1000, height: 1000 },
        blocks: [
          {
            type: "text",
            content: "An array is a contiguous sequence of elements indexed from zero with constant-time access.",
            top_left_x: 100,
            top_left_y: 100,
            bottom_right_x: 900,
            bottom_right_y: 200,
          },
        ],
      },
    ],
  })),
}));

const pdfForm = () => {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array([1, 2, 3])], "book.pdf", { type: "application/pdf" }));
  return fd;
};

describe("RAG + chat routes", () => {
  let key: string;

  beforeEach(async () => {
    await resetDatabase();
    clearMemoryStorage();
    key = await makeVerifiedUserWithKey("rag-owner");
  });

  const call = (path: string, init: RequestInit = {}) =>
    app.request(`/api/v1${path}`, { ...init, headers: { "x-api-key": key, ...init.headers } }, testBindings);

  const jsonInit = (body: unknown): RequestInit => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  it("rejects an unauthenticated request", async () => {
    expect((await app.request("/api/v1/documents", {}, testBindings)).status).toBe(401);
  });

  it("ingests a PDF, lists it, retrieves, answers, then deletes", async () => {
    const ing = await call("/ingest", { method: "POST", body: pdfForm() });
    expect(ing.status).toBe(201);
    const { documentId, chunkCount } = await ing.json();
    expect(chunkCount).toBeGreaterThan(0);

    expect(await (await call("/documents")).json()).toMatchObject({
      items: [{ id: documentId, filename: "book.pdf", chunkCount }],
    });

    const ret = await call("/retrieval", jsonInit({ question: "what is an array?" }));
    expect((await ret.json()).chunks.length).toBeGreaterThan(0);

    const chat = await call("/chat", jsonInit({ question: "what is an array?" }));
    expect(await chat.json()).toMatchObject({ answer: "An array is a contiguous sequence." });

    expect((await call(`/documents/${documentId}`, { method: "DELETE" })).status).toBe(204);
    expect(await (await call("/documents")).json()).toMatchObject({ items: [] });
  });

  it("chat 422s before anything is ingested", async () => {
    const res = await call("/chat", jsonInit({ question: "hi" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "no_index" });
  });

  it("ingest 400s without a file", async () => {
    const res = await call("/ingest", { method: "POST", body: new FormData() });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "bad_request" });
  });

  it("never lists another owner's documents", async () => {
    await call("/ingest", { method: "POST", body: pdfForm() });
    const otherKey = await makeVerifiedUserWithKey("other-owner");
    const res = await app.request("/api/v1/documents", { headers: { "x-api-key": otherKey } }, testBindings);
    expect(await res.json()).toMatchObject({ items: [] });
  });
});
