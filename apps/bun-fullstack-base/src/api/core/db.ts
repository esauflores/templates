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
 * SQLite inside Bun (bun:sqlite) with Drizzle's typed queries. Queries are synchronous. Each module declares its
 * tables in `<module>.tables.ts`.
 * - journal_mode = WAL: readers don't wait for the writer. The check below fails start on a filesystem that refuses it.
 * - synchronous = NORMAL: syncs at checkpoints, not every commit. A process crash loses nothing.
 * - foreign_keys = ON: enforces `.references()`, which SQLite leaves off by default.
 * - busy_timeout = 5000: waits up to 5 s for another writer instead of failing with SQLITE_BUSY.
 */
export const db = drizzle(path);

db.run(sql`PRAGMA journal_mode = WAL`);
db.run(sql`PRAGMA synchronous = NORMAL`);
db.run(sql`PRAGMA foreign_keys = ON`);
db.run(sql`PRAGMA busy_timeout = 5000`);

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
