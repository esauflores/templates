// App
import { testBindings } from "@/env";
import app from "@/index";

import { loadVectors } from "./store";

// External
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/mistral", () => ({
  embeddings: () => ({
    embedQuery: vi.fn().mockResolvedValue([1, 0]),
  }),
}));

const emptyIndex = { ...testBindings, INDEX_PATH: "./data/missing-index.json" };

describe("POST /retrieval", () => {
  beforeEach(() => {
    loadVectors([]);
  });

  it("returns 400 when question is missing", async () => {
    const res = await app.request(
      "/retrieval",
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

  it("returns empty chunks when the index is empty", async () => {
    const res = await app.request(
      "/retrieval",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What is an array?" }),
      },
      emptyIndex,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ chunks: [] });
  });

  it("returns nearest chunks", async () => {
    loadVectors([
      { id: "c0", content: "An array is contiguous.", positions: [[1, 0, 10, 0, 10]], embedding: [1, 0] },
      { id: "c1", content: "A graph is nodes and edges.", positions: [[2, 0, 10, 0, 10]], embedding: [0, 1] },
    ]);
    const res = await app.request(
      "/retrieval",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What is an array?", top_k: 1 }),
      },
      testBindings,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      chunks: [{ id: "c0", content: "An array is contiguous.", positions: [[1, 0, 10, 0, 10]] }],
    });
  });
});
