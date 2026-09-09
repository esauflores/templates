// External
import { beforeEach, describe, expect, it, vi } from "vitest";

// App
import { testBindings } from "@/env";

// Database
import { EMBED_DIM, ragChunks, ragDocuments } from "@/db/schema";

// Infrastructure
import { db } from "@/infrastructure/db";

// Test Utilities
import { resetDatabase } from "@/helpers/test/pglite";

// Feature
import { retrieve } from "./store";

/** A 1024-dim vector with the first two components set. */
const vec = (a = 0, b = 0) => Array.from({ length: EMBED_DIM }, (_, i) => (i === 0 ? a : i === 1 ? b : 0));

vi.mock("@/infrastructure/mistral", () => ({
  // Query embedding: aligned with `vec(1, 0)` so that chunk ranks first.
  embed: vi.fn(async (_key: string, texts: string[]) =>
    texts.map(() => Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0))),
  ),
}));

const OWNER = "owner-1";

const seed = async () => {
  const [doc] = await db(testBindings)
    .insert(ragDocuments)
    .values({ ownerId: OWNER, filename: "x.pdf", storageKey: "k", pages: 1, chunkCount: 2 })
    .returning();

  await db(testBindings)
    .insert(ragChunks)
    .values([
      { documentId: doc.id, ownerId: OWNER, content: "arrays", positions: [[1, 0, 10, 0, 10]], embedding: vec(1, 0) },
      { documentId: doc.id, ownerId: OWNER, content: "graphs", positions: [[2, 0, 10, 0, 10]], embedding: vec(0, 1) },
    ]);
};

describe("retrieve", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns [] when the owner has no chunks", async () => {
    expect(await retrieve(testBindings, OWNER, "arrays")).toEqual([]);
  });

  it("ranks the owner's chunks by cosine distance to the query", async () => {
    await seed();
    const hits = await retrieve(testBindings, OWNER, "arrays", 1);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ content: "arrays", positions: [[1, 0, 10, 0, 10]] });
  });

  it("never returns another owner's chunks", async () => {
    await seed();
    expect(await retrieve(testBindings, "someone-else", "arrays")).toEqual([]);
  });
});
