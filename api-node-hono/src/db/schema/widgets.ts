import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Reference CRUD resource. `ownerId` holds the API key's `referenceId` (the
 * owning user) — rows are always scoped to it, never queried globally. It is a
 * plain indexed column, not an FK, to match how `apikey.referenceId` is modelled.
 */
export const widgets = pgTable(
  "widgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("widgets_owner_id_idx").on(table.ownerId)],
);

export type Widget = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;
