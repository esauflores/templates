import { v } from "convex/values";

import type { Doc, Id, TableNames } from "@/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "@/_generated/server";
import { requireUserId, requireWriter } from "@/infrastructure/identity/auth";

/**
 * The server half of an offline-sync protocol (RxDB's replication contract, but
 * nothing here is RxDB-specific). Each replicated resource exposes two functions
 * built on the helpers below:
 *
 *   pull({ checkpoint, limit })      → { documents, checkpoint }
 *   push({ changeRows })             → conflicts (always [] here — see below)
 *
 * **What's replicated:** the four flat resources — `customers`, `products`,
 * `projects`, `tickets`. `invoices` and `orders` are not: they hold foreign keys
 * to rows that may only exist on the client yet, and `orders` totals are
 * computed server-side on purpose. Replicating them means resolving parents by
 * `clientId` and deciding whether to trust or recompute derived values — an
 * app-specific call, left out of the template.
 *
 * **Conflict model:** last-write-wins on `updatedAt`. `push` never returns a
 * conflict row; if the server's copy is newer it simply keeps it and the client
 * re-pulls it on the next cycle. That's enough for single-owner data. An app
 * with concurrent multi-device edits on the same row would instead compare
 * `assumedMasterState`, return the current server state as a conflict, and merge
 * it in a client-side `conflictHandler`.
 */

/** The resources wired for offline replication. */
export const REPLICATED_TABLES = ["customers", "products", "projects", "tickets"] as const;
export type ReplicatedTable = (typeof REPLICATED_TABLES)[number];

/** `(updatedAt, clientId)` of the last row a client has seen — `null` on first sync. */
export const vCheckpoint = v.union(v.object({ updatedAt: v.number(), clientId: v.string() }), v.null());
export type Checkpoint = { updatedAt: number; clientId: string } | null;

/** A deleted row as it comes back from `pull` — the tombstone, not the vanished doc. */
export const vTombstone = v.object({
  clientId: v.string(),
  updatedAt: v.number(),
  _deleted: v.literal(true),
});

type PulledLive<T extends ReplicatedTable> = Doc<T> & { _deleted: false };
type PulledDead = { clientId: string; updatedAt: number; _deleted: true };
type Pulled<T extends ReplicatedTable> = PulledLive<T> | PulledDead;

/** RxDB sends the full client-side doc state (schema fields + `_deleted`). */
export type PushRow<T extends ReplicatedTable> = {
  newDocumentState: Omit<Doc<T>, "_id" | "_creationTime" | "ownerId"> & { _deleted?: boolean };
  assumedMasterState?: unknown; // ignored — server resolves last-write-wins
};

const afterCheckpoint = (row: { updatedAt: number; clientId: string }, cp: Checkpoint): boolean =>
  !cp || row.updatedAt > cp.updatedAt || (row.updatedAt === cp.updatedAt && row.clientId > cp.clientId);

const byCheckpoint = (a: { updatedAt: number; clientId: string }, b: { updatedAt: number; clientId: string }): number =>
  a.updatedAt - b.updatedAt || (a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0);

/**
 * Everything the caller changed at or after `checkpoint`, live rows and
 * tombstones merged, ordered by `(updatedAt, clientId)`, capped at `limit`. The
 * returned `checkpoint` is the last row emitted (or the one passed in, if
 * nothing was) — hand it back to fetch the next page.
 *
 * ponytail: `.take(limit + 1)` per source assumes `updatedAt` collisions are
 * rare. At hundreds of rows RxDB pulls everything in one batch so it never
 * matters; a deployment with large bursts of identical timestamps would widen
 * the take or add an `_id` tiebreak sub-query.
 */
export async function pullChanges<T extends ReplicatedTable>(
  ctx: QueryCtx,
  table: T,
  checkpoint: Checkpoint,
  limit: number,
): Promise<{ documents: Pulled<T>[]; checkpoint: Checkpoint }> {
  const ownerId = await requireUserId(ctx);
  const since = checkpoint?.updatedAt ?? 0;

  // Convex's index-range builder can't stay generic across a union of tables, so
  // the query is built against a representative one — every replicated table has
  // the same `clientId` / `updatedAt` columns and indexes — and rows cast back.
  const live = (await ctx.db
    .query(table as "customers")
    .withIndex("by_ownerId_and_updatedAt", (q) => q.eq("ownerId", ownerId).gte("updatedAt", since))
    .take(limit + 1)) as unknown as Doc<T>[];

  const dead = await ctx.db
    .query("tombstones")
    .withIndex("by_ownerId_and_table_and_updatedAt", (q) =>
      q.eq("ownerId", ownerId).eq("table", table).gte("updatedAt", since),
    )
    .take(limit + 1);

  const merged = [
    ...live.map((d) => ({ clientId: d.clientId, updatedAt: d.updatedAt, doc: d as Doc<T> | undefined, dead: false })),
    ...dead.map((t) => ({ clientId: t.clientId, updatedAt: t.updatedAt, doc: undefined, dead: true })),
  ]
    .filter((r) => afterCheckpoint(r, checkpoint))
    .sort(byCheckpoint)
    .slice(0, limit);

  const documents = merged.map((r) =>
    r.dead
      ? ({ clientId: r.clientId, updatedAt: r.updatedAt, _deleted: true } satisfies PulledDead)
      : ({ ...(r.doc as Doc<T>), _deleted: false } as PulledLive<T>),
  );
  const last = merged.at(-1);
  return { documents, checkpoint: last ? { updatedAt: last.updatedAt, clientId: last.clientId } : checkpoint };
}

/**
 * Apply a batch of client writes. New `clientId` → insert; known `clientId` →
 * last-write-wins patch; `_deleted` → drop the row and record a tombstone.
 * Spends one `writes` rate-limit token for the batch (via `requireWriter`).
 */
export async function pushChanges<T extends ReplicatedTable>(
  ctx: MutationCtx,
  table: T,
  changeRows: PushRow<T>[],
): Promise<never[]> {
  const ownerId = await requireWriter(ctx);

  const rowId = (id: unknown) => id as Id<T>;

  for (const { newDocumentState } of changeRows) {
    const { _deleted, clientId, updatedAt, ...fields } = newDocumentState as PushRow<T>["newDocumentState"] & {
      clientId: string;
      updatedAt: number;
    };

    // Representative-table cast, as in `pullChanges` — same columns and indexes.
    const existing = (await ctx.db
      .query(table as "customers")
      .withIndex("by_ownerId_and_clientId", (q) => q.eq("ownerId", ownerId).eq("clientId", clientId))
      .unique()) as { _id: Id<"customers">; updatedAt: number } | null;

    if (_deleted) {
      if (existing) await ctx.db.delete(table, rowId(existing._id));
      await writeTombstone(ctx, table, ownerId, clientId);
      continue;
    }

    if (existing) {
      if (existing.updatedAt >= updatedAt) continue; // server's copy wins; client re-pulls it
      await ctx.db.patch(table, rowId(existing._id), { ...fields, updatedAt } as never);
    } else {
      await ctx.db.insert(table, { ownerId, clientId, updatedAt, ...fields } as never);
    }
  }

  return [];
}

/** Record (or refresh) a tombstone so `pull` can tell offline clients the row is gone. */
export async function writeTombstone(
  ctx: MutationCtx,
  table: TableNames,
  ownerId: string,
  clientId: string,
): Promise<void> {
  const updatedAt = Date.now();
  const existing = await ctx.db
    .query("tombstones")
    .withIndex("by_ownerId_and_table_and_clientId", (q) =>
      q.eq("ownerId", ownerId).eq("table", table).eq("clientId", clientId),
    )
    .unique();
  if (existing) await ctx.db.patch("tombstones", existing._id, { updatedAt });
  else await ctx.db.insert("tombstones", { ownerId, table, clientId, updatedAt });
}

/**
 * `clientId` + `updatedAt` for an insert. Offline clients always mint their own
 * `clientId`; a plain REST `create` omits it and the server generates one.
 */
export const stampCreate = (clientId?: string): { clientId: string; updatedAt: number } => ({
  clientId: clientId ?? crypto.randomUUID(),
  updatedAt: Date.now(),
});

/** Bump `updatedAt` on every mutation of a replicated row, so `pull` notices it. */
export const stampUpdate = (): { updatedAt: number } => ({ updatedAt: Date.now() });
