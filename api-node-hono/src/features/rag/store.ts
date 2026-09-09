// External
import { and, cosineDistance, desc, eq } from "drizzle-orm";

// App
import type { Bindings } from "@/env";

// Database
import { type ChunkPosition, type RagDocument, ragChunks, ragDocuments } from "@/db/schema";

// Infrastructure
import { db } from "@/infrastructure/db";
import { embed } from "@/infrastructure/mistral";

// Middleware
import { ApiError } from "@/middleware/errors";

// Feature
import type { RagDoc } from "./chunk";

export type RetrievedChunk = { id: string; content: string; positions: ChunkPosition[] };

const EMBED_BATCH = 32;

async function embedAll(env: Bindings, texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    out.push(...(await embed(env.MISTRAL_API_KEY, texts.slice(i, i + EMBED_BATCH))));
  }
  return out;
}

/**
 * Persist an OCR'd + chunked PDF: one `rag_documents` row plus its embedded
 * `rag_chunks`. neon-http has no interactive transactions, so on a chunk-insert
 * failure the document row is rolled back by hand.
 */
export async function ingestDocument(
  env: Bindings,
  ownerId: string,
  meta: { filename: string; storageKey: string; pages: number },
  docs: RagDoc[],
): Promise<{ documentId: string; chunkCount: number }> {
  const vectors = await embedAll(
    env,
    docs.map((d) => d.pageContent),
  );

  const [doc] = await db(env)
    .insert(ragDocuments)
    .values({
      ownerId,
      filename: meta.filename,
      storageKey: meta.storageKey,
      pages: meta.pages,
      chunkCount: docs.length,
    })
    .returning();

  try {
    if (docs.length > 0) {
      await db(env)
        .insert(ragChunks)
        .values(
          docs.map((d, i) => ({
            documentId: doc.id,
            ownerId,
            content: d.pageContent,
            positions: d.metadata.positions,
            embedding: vectors[i] ?? [],
          })),
        );
    }
  } catch (err) {
    await db(env).delete(ragDocuments).where(eq(ragDocuments.id, doc.id));
    throw err;
  }

  return { documentId: doc.id, chunkCount: docs.length };
}

/** Nearest chunks to `question` across the owner's whole corpus, ranked by pgvector cosine distance. */
export async function retrieve(env: Bindings, ownerId: string, question: string, k = 6): Promise<RetrievedChunk[]> {
  const [q] = await embed(env.MISTRAL_API_KEY, [question]);
  if (!q) return [];

  return db(env)
    .select({ id: ragChunks.id, content: ragChunks.content, positions: ragChunks.positions })
    .from(ragChunks)
    .where(eq(ragChunks.ownerId, ownerId))
    .orderBy(cosineDistance(ragChunks.embedding, q))
    .limit(k);
}

export async function listDocuments(env: Bindings, ownerId: string): Promise<RagDocument[]> {
  return db(env)
    .select()
    .from(ragDocuments)
    .where(eq(ragDocuments.ownerId, ownerId))
    .orderBy(desc(ragDocuments.createdAt));
}

export async function getDocument(env: Bindings, ownerId: string, id: string): Promise<RagDocument> {
  const [row] = await db(env)
    .select()
    .from(ragDocuments)
    .where(and(eq(ragDocuments.id, id), eq(ragDocuments.ownerId, ownerId)))
    .limit(1);
  if (!row) throw new ApiError(404, "not_found", "Document not found");
  return row;
}

/** Delete a document (chunks cascade); returns its storage key so the route can purge the blob. */
export async function deleteDocument(env: Bindings, ownerId: string, id: string): Promise<string> {
  const [row] = await db(env)
    .delete(ragDocuments)
    .where(and(eq(ragDocuments.id, id), eq(ragDocuments.ownerId, ownerId)))
    .returning();
  if (!row) throw new ApiError(404, "not_found", "Document not found");
  return row.storageKey;
}
