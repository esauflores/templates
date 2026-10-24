import { sql } from "drizzle-orm";
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vite-plus/test";

import { db } from "@/api/core/db.ts";

import { notes } from "./notes.tables.ts";

/**
 * A table's columns as declared, and as the migrations built them: they differ when `bun run db:generate` was missed.
 * SQLite reports types in capitals, and an INTEGER PRIMARY KEY as nullable though it never is: both are evened out.
 */
const declared = (table: SQLiteTable) =>
  getTableConfig(table).columns.map((c) => ({
    name: c.name,
    type: c.getSQLType().toLowerCase(),
    notNull: c.notNull,
    pk: c.primary,
  }));

const migrated = (name: string) =>
  db
    .all<{ name: string; type: string; notnull: number; pk: number }>(sql`SELECT * FROM pragma_table_info(${name})`)
    .map((c) => ({ name: c.name, type: c.type.toLowerCase(), notNull: c.notnull === 1 || c.pk > 0, pk: c.pk > 0 }));

describe("notes tables", () => {
  it("match the migrations (run bun run db:generate after changing them)", () => {
    expect(migrated("notes")).toEqual(declared(notes));
  });
});
