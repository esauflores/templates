import { defineConfig } from "drizzle-kit";

/** `bun run db:generate` compares the modules' tables with the last migration and writes a new one into
 * src/api/core/migrations/, next to core/db.ts, which applies them. */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/api/*/*.tables.ts",
  out: "./src/api/core/migrations",
});
