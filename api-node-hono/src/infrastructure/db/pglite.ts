// External
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";

// App
import type { Bindings } from "@/env";

// `vector` loads pgvector so the RAG migration's `CREATE EXTENSION vector` works
// in-process. Neon has pgvector built in, so its client needs nothing extra.
const client = new PGlite({ extensions: { vector } });
export const db = (_env: Bindings) => drizzle({ client });
