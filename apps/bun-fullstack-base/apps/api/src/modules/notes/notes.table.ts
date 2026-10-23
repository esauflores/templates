import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Notes, newest first by id. createdAt is an ISO string, as the API answers it. */
export const notes = sqliteTable("notes", {
  id: integer().primaryKey({ autoIncrement: true }),
  text: text().notNull(),
  createdAt: text()
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
