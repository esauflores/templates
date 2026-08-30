// App
import { loadVectors, search } from "./store";

// External
import { describe, expect, it } from "vitest";

describe("search", () => {
  it("returns nearest chunks by cosine similarity", () => {
    loadVectors([
      { id: "a", content: "arrays", positions: [[1, 0, 10, 0, 10]], embedding: [1, 0] },
      { id: "b", content: "graphs", positions: [[2, 0, 10, 0, 10]], embedding: [0, 1] },
    ]);
    const hits = search([0.9, 0.1], 1);
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe("a");
    expect(hits[0].positions).toEqual([[1, 0, 10, 0, 10]]);
  });
});
