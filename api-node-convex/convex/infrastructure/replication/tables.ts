import { defineTable } from "convex/server";
import { v } from "convex/values";

/** One server-owned, monotonic replication version per owner. */
export const replicationTables = {
  syncClocks: defineTable({ ownerId: v.string(), updatedAt: v.number() }).index("by_ownerId", ["ownerId"]),
};

/**
 * Fields every replicated table carries on top of its own columns:
 *
 * - `clientId` — a stable id the client mints before the row ever reaches the
 *   server, so an offline insert has an identity to push and pull under. It's
 *   the RxDB primary key; Convex's `_id` is server-only.
 * - `updatedAt` — a server-owned, per-owner monotonic version. The `pull`
 *   checkpoint orders by it; clients use it as an optimistic-concurrency token.
 * - `deleted` — optional during the rollout so pre-existing rows remain
 *   readable; the backfill migration writes `false`. It is a soft-delete, so
 *   clients that were offline learn that the document was removed.
 */
export const replicatedFields = {
  clientId: v.string(),
  updatedAt: v.number(),
  deleted: v.optional(v.boolean()),
};
