// External
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const client = new PGlite();
const _db = drizzle({ client });

export const db = () => _db;

export const resetDatabase = async () => {
  await db().execute(sql`DROP SCHEMA public CASCADE`);
  await db().execute(sql`CREATE SCHEMA public`);

  await migrate(db(), {
    migrationsFolder: "./drizzle",
    migrationsSchema: "public",
  });
};
