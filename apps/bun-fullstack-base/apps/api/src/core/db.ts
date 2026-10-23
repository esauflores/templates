import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/tursodatabase/database";
import { migrate } from "drizzle-orm/tursodatabase/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The database file, DATABASE_PATH or /data/app.db, the Docker image's volume (`:memory:` for one that lives with the
 * process, as the tests use).
 */
const path = process.env.DATABASE_PATH || "/data/app.db";

/**
 * The migrations drizzle-kit generates from the tables (`bun run db:generate`), two folders up: from this file,
 * apps/api/drizzle/; built, from dist/server/src/server.js, dist/drizzle/, where build.ts copies them.
 */
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

/**
 * The database: [Turso](https://github.com/tursodatabase/turso), SQLite rewritten in Rust, in the process, with
 * Drizzle's typed queries. Each module declares its tables in `<module>.table.ts`. The migrations not yet applied
 * run once, the first time this file is imported, so the server starts on the current tables.
 * - Turso always journals to a WAL (app.db-wal): reads don't wait for writes.
 * - synchronous = NORMAL syncs the disk at checkpoints, not on every commit: about 30 times the writes a second.
 *   A crash of the process loses nothing; a power cut can lose the last commits, never the file.
 */
export const db = drizzle(path);

await db.run(sql`PRAGMA synchronous = NORMAL`);
await migrate(db, { migrationsFolder });
