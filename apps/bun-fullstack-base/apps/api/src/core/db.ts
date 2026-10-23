import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
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
 * The database: SQLite, the copy inside Bun (bun:sqlite, no addon to install or load), in the process, with Drizzle's
 * typed queries, which are synchronous: a query blocks the process for its length, there's no round trip to wait on.
 * Each module declares its tables in `<module>.table.ts`. The migrations not yet applied run once, the first time
 * this file is imported, so the server starts on the current tables.
 * - journal_mode = WAL journals next to the file (app.db-wal): readers don't wait for the writer.
 * - synchronous = NORMAL syncs the disk at checkpoints, not on every commit: about 40 times the writes a second of
 *   FULL, and faster than OFF, which risks the file. A crash of the process loses nothing; a power cut can lose the
 *   last commits, never the file.
 * - foreign_keys = ON makes a column's `.references()` hold: a row can't point at one that doesn't exist (off by
 *   default). SQLite has no `require_where`, which Turso's build added: an UPDATE or DELETE without a WHERE is a
 *   mistake Drizzle's own API mostly rules out, but the engine no longer refuses one.
 */
export const db = drizzle(path);

db.run(sql`PRAGMA journal_mode = WAL`);
db.run(sql`PRAGMA synchronous = NORMAL`);
db.run(sql`PRAGMA foreign_keys = ON`);
migrate(db, { migrationsFolder });
