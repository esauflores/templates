// External
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { Document } from "@langchain/core/documents";

// App
import type { Bindings } from "@/env";

import type { ChunkPosition } from "./chunk";

// Infrastructure
import { embeddings } from "@/infrastructure/mistral";

export type RagChunk = {
  id: string;
  content: string;
  positions: ChunkPosition[];
};

type StoredChunk = RagChunk & { embedding: number[] };

const EMBED_BATCH = 32;

let chunks: StoredChunk[] = [];

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function chunkCount(): number {
  return chunks.length;
}

export function search(query: number[], k = 6): RagChunk[] {
  return [...chunks]
    .map((c) => ({ c, score: cosine(query, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ c }) => ({ id: c.id, content: c.content, positions: c.positions }));
}

export async function loadIndex(env: Bindings): Promise<void> {
  try {
    const raw = JSON.parse(await readFile(env.INDEX_PATH, "utf8")) as { chunks?: StoredChunk[] };
    chunks = Array.isArray(raw.chunks) ? raw.chunks : [];
  } catch {
    chunks = [];
  }
}

async function saveIndex(env: Bindings): Promise<void> {
  await mkdir(dirname(env.INDEX_PATH), { recursive: true });
  await writeFile(env.INDEX_PATH, JSON.stringify({ chunks }));
}

export async function replaceIndex(env: Bindings, docs: Document[]): Promise<void> {
  const model = embeddings(env.MISTRAL_API_KEY);
  const vectors: number[][] = [];
  for (let i = 0; i < docs.length; i += EMBED_BATCH) {
    vectors.push(...(await model.embedDocuments(docs.slice(i, i + EMBED_BATCH).map((d) => d.pageContent))));
  }
  chunks = docs.map((doc, i) => ({
    id: String(doc.metadata.id ?? `c${i}`),
    content: doc.pageContent,
    positions: (doc.metadata.positions ?? []) as ChunkPosition[],
    embedding: vectors[i] ?? [],
  }));
  await saveIndex(env);
}

export async function retrieve(env: Bindings, question: string, k = 6): Promise<RagChunk[]> {
  if (chunks.length === 0) await loadIndex(env);
  if (chunks.length === 0) return [];
  const q = await embeddings(env.MISTRAL_API_KEY).embedQuery(question);
  return search(q, k);
}

/** Test helper: load vectors without calling Mistral. */
export function loadVectors(rows: StoredChunk[]): void {
  chunks = rows;
}
