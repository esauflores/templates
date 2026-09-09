import { index, integer, jsonb, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

/** Overlay contract for a source box: `[page, left, right, top, bottom]` as % of the page. */
export type ChunkPosition = [number, number, number, number, number];

/** Embedding width. `mistral-embed` returns 1024-dim vectors. */
export const EMBED_DIM = 1024;

/** One ingested PDF. The bytes live in object storage under `storageKey`. */
export const ragDocuments = pgTable(
  "rag_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    filename: text("filename").notNull(),
    storageKey: text("storage_key").notNull(),
    pages: integer("pages").notNull().default(0),
    chunkCount: integer("chunk_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rag_documents_owner_id_idx").on(t.ownerId)],
);

/**
 * A retrievable chunk. `embedding` is a real pgvector column — ranked with the
 * `<=>` cosine operator (`cosineDistance` in `features/rag/store.ts`). The HNSW
 * index makes nearest-neighbour search sublinear; drop it for exact search.
 */
export const ragChunks = pgTable(
  "rag_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => ragDocuments.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    content: text("content").notNull(),
    positions: jsonb("positions").$type<ChunkPosition[]>().notNull().default([]),
    embedding: vector("embedding", { dimensions: EMBED_DIM }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rag_chunks_owner_id_idx").on(t.ownerId),
    index("rag_chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export type RagDocument = typeof ragDocuments.$inferSelect;
export type NewRagDocument = typeof ragDocuments.$inferInsert;
export type RagChunkRow = typeof ragChunks.$inferSelect;
export type NewRagChunkRow = typeof ragChunks.$inferInsert;
