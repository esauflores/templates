import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "@/api/core/config.ts";

/** The database file, DATABASE_PATH (core/config.ts). */
const path = config().DATABASE_PATH;
if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

/**
 * The database: SQLite inside Bun (bun:sqlite), in the process, with Drizzle's typed queries. They're synchronous: a
 * query blocks the process for its length, with no round trip to wait on. Each module declares its tables in
 * `<module>.tables.ts`.
 * - journal_mode = WAL: readers don't wait for the writer. A filesystem without WAL support (NFS, some bind mounts)
 *   silently keeps the old mode, which the check below turns into a failure at start rather than slow writes.
 * - synchronous = NORMAL syncs the disk at checkpoints, not on every commit: about 40 times the writes a second of
 *   FULL. A crash of the process loses nothing; a power cut can lose the last commits, never the file.
 * - foreign_keys = ON makes a column's `.references()` hold (SQLite leaves it off by default).
 */
export const db = drizzle(path);

db.run(sql`PRAGMA journal_mode = WAL`);
db.run(sql`PRAGMA synchronous = NORMAL`);
db.run(sql`PRAGMA foreign_keys = ON`);

/** What each pragma must read back as, checked at start rather than run with the wrong setting. */
const expected: Record<string, readonly unknown[]> = {
  journal_mode: ["wal", "memory"],
  synchronous: [1], // NORMAL
  foreign_keys: [1],
};

for (const [name, allowed] of Object.entries(expected)) {
  const value = db.get<Record<string, unknown>>(sql.raw(`PRAGMA ${name}`))?.[name];
  if (!allowed.includes(value)) {
    throw new Error(`PRAGMA ${name} is ${JSON.stringify(value)} on ${path}, expected ${allowed.join(" or ")}`);
  }
}

/** Applies the migrations not yet run, at start, from migrations/ (dist/migrations/ in the build). */
migrate(db, { migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)) });
