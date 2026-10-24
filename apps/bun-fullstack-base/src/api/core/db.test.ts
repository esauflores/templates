import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vite-plus/test";

import { createApp } from "@/api/app.ts";
import { db } from "@/api/core/db.ts";

describe("db", () => {
  it("is migrated, with foreign keys enforced and synchronous = NORMAL", () => {
    const tables = db.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'table'`);

    expect(tables.map((table) => table.name)).toContain("notes");
    expect(db.get(sql`PRAGMA foreign_keys`)).toEqual({ foreign_keys: 1 });
    expect(db.get(sql`PRAGMA synchronous`)).toEqual({ synchronous: 1 });
  });

  /** Last, as it closes the database: its own file, so no other test file loses it. */
  it("fails the health check with a 500 when it can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.$client.close();

    const response = await createApp().request("/api/health");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
  });
});
