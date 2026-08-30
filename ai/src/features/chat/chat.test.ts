// App
import { testBindings } from "@/env";
import { loadVectors } from "@/features/rag/store";
import app from "@/index";

// External
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/mistral", () => ({
  complete: vi.fn().mockResolvedValue("An array is a contiguous sequence."),
  embeddings: () => ({
    embedQuery: vi.fn().mockResolvedValue([1, 0]),
  }),
}));

const emptyIndex = { ...testBindings, INDEX_PATH: "./data/missing-index.json" };

describe("POST /chat", () => {
  beforeEach(() => {
    loadVectors([]);
  });

  it("returns 400 when question is missing", async () => {
    const res = await app.request(
      "/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      emptyIndex,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "question required" });
  });

  it("returns 422 when the index is empty", async () => {
    const res = await app.request(
      "/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What is an array?" }),
      },
      emptyIndex,
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "ingest a PDF first" });
  });

  it("returns an answer and the retrieved chunks", async () => {
    loadVectors([
      { id: "c0", content: "An array is a contiguous sequence.", positions: [[1, 0, 10, 0, 10]], embedding: [1, 0] },
    ]);
    const res = await app.request(
      "/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What is an array?" }),
      },
      testBindings,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      answer: "An array is a contiguous sequence.",
      chunks: [{ id: "c0", content: "An array is a contiguous sequence.", positions: [[1, 0, 10, 0, 10]] }],
    });
  });
});
