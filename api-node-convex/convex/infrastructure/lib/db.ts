import type { Doc, Id, TableNames } from "@/_generated/dataModel";
import type { QueryCtx } from "@/_generated/server";

import { notFound } from "./errors";

/**
 * Shared database helpers. There's no client or connection to configure — Convex
 * injects `ctx.db` into every function — and the schema is forced to live at
 * `convex/schema.ts`. What lives here is the cross-cutting ownership check.
 */

/** Every table whose documents carry an `ownerId`, derived from the schema. */
export type OwnedTable = { [T in TableNames]: Doc<T> extends { ownerId: string } ? T : never }[TableNames];

/**
 * Load a document and confirm it belongs to `ownerId`, else throw `NOT_FOUND`.
 *
 * The `table` argument is not redundant with `id`: passing it explicitly is the
 * form Convex recommends (the inferred one is slated for deprecation), and it
 * keeps the return type a real `Doc<T>` so `doc.ownerId` is checked by the
 * compiler rather than cast.
 *
 * A row owned by someone else is reported as missing on purpose — telling the
 * caller it exists would leak the id space across tenants.
 */
export async function requireOwned<T extends OwnedTable>(
  ctx: QueryCtx,
  table: T,
  id: Id<T>,
  ownerId: string,
): Promise<Doc<T>> {
  const doc = await ctx.db.get(table, id);
  if (!doc || doc.ownerId !== ownerId || ("deleted" in doc && doc.deleted)) throw notFound(`${table} not found`);
  return doc;
}

/**
 * Default and maximum page sizes for the capped `list` reads. Anything that can
 * grow without bound should use the `paginated` query instead.
 */
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export const clampLimit = (limit: number | undefined): number =>
  Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
