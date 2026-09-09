// External
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";

// App
import { testBindings } from "@/env";

// Infrastructure
import { db } from "@/infrastructure/db/pglite";

export const resetDatabase = async () => {
  await db(testBindings).execute(sql`DROP SCHEMA public CASCADE`);
  await db(testBindings).execute(sql`CREATE SCHEMA public`);

  await migrate(db(testBindings), {
    migrationsFolder: "./drizzle",
    migrationsSchema: "public",
  });
};
