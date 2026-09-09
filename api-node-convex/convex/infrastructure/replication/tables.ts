import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Replication bookkeeping — one table, shared by every resource that syncs to an
 * offline client (RxDB and the like). See `replication.ts` for the protocol.
 *
 * A hard `DELETE` is invisible to a client that was offline when it happened: on
 * reconnect it re-pushes its stale copy and resurrects the row. So `remove`
 * records a tombstone here, and the `pull` endpoint replays it as a `_deleted`
 * document. Tombstones are keyed by the row's client-minted `clientId`, not its
 * Convex `_id`, because that's the id the client still holds.
 *
 * Tombstones accrue forever. A real deployment prunes ones older than the
 * longest offline window it supports (a cron over `by_ownerId_and_table_and_updatedAt`).
 */
export const replicationTables = {
  tombstones: defineTable({
    ownerId: v.string(),
    table: v.string(),
    clientId: v.string(),
    updatedAt: v.number(),
  })
    .index("by_ownerId_and_table_and_updatedAt", ["ownerId", "table", "updatedAt"])
    .index("by_ownerId_and_table_and_clientId", ["ownerId", "table", "clientId"]),
};

/**
 * Fields every replicated table carries on top of its own columns:
 *
 * - `clientId` — a stable id the client mints before the row ever reaches the
 *   server, so an offline insert has an identity to push and pull under. It's
 *   the RxDB primary key; Convex's `_id` is server-only.
 * - `updatedAt` — epoch millis, bumped on every write. The `pull` checkpoint
 *   orders by it, and `push` resolves conflicts last-write-wins on it.
 */
export const replicatedFields = {
  clientId: v.string(),
  updatedAt: v.number(),
};
