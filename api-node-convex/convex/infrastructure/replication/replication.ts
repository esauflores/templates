import { v } from "convex/values";

import type { Doc, Id } from "@/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "@/_generated/server";
import { requireUserId, requireWriter } from "@/infrastructure/identity/auth";

/** The four flat resources wired for RxDB replication. */
export const REPLICATED_TABLES = ["customers", "products", "projects", "tickets"] as const;
export type ReplicatedTable = (typeof REPLICATED_TABLES)[number];

/** A server-owned monotonically increasing version, or `null` on first pull. */
export const vCheckpoint = v.union(v.number(), v.null());
export type Checkpoint = number | null;

export type ReplicationDoc<T extends ReplicatedTable> = Omit<
  Doc<T>,
  "_id" | "_creationTime" | "ownerId" | "deleted"
> & {
  _deleted: boolean;
};
export type PushRow<T extends ReplicatedTable> = {
  newDocumentState: ReplicationDoc<T>;
  assumedMasterState?: unknown;
};

/** Pull rows changed after the checkpoint. A unique server version makes paging exact. */
export async function pullChanges<T extends ReplicatedTable>(
  ctx: QueryCtx,
  table: T,
  checkpoint: Checkpoint,
  limit: number,
): Promise<{ documents: ReplicationDoc<T>[]; checkpoint: Checkpoint }> {
  const ownerId = await requireUserId(ctx);
  const rows = (await ctx.db
    .query(table as "customers")
    .withIndex("by_ownerId_and_updatedAt", (q) =>
      checkpoint === null ? q.eq("ownerId", ownerId) : q.eq("ownerId", ownerId).gt("updatedAt", checkpoint),
    )
    .take(limit)) as unknown as Doc<T>[];
  const documents = rows.map(toReplicationDoc);
  return { documents, checkpoint: documents.at(-1)?.updatedAt ?? checkpoint };
}

/** Apply client writes and return current master rows for RxDB conflicts. */
export async function pushChanges<T extends ReplicatedTable>(
  ctx: MutationCtx,
  table: T,
  changeRows: PushRow<T>[],
): Promise<ReplicationDoc<T>[]> {
  const ownerId = await requireWriter(ctx);
  const conflicts: ReplicationDoc<T>[] = [];
  const rowId = (id: unknown) => id as Id<T>;

  for (const row of changeRows) {
    const {
      _deleted,
      clientId,
      updatedAt: _updatedAt,
      ...fields
    } = row.newDocumentState as PushRow<T>["newDocumentState"] & ReplicationDoc<T>;
    const existing = (await ctx.db
      .query(table as "customers")
      .withIndex("by_ownerId_and_clientId", (q) => q.eq("ownerId", ownerId).eq("clientId", clientId))
      .unique()) as { _id: Id<T> } | null;

    if (!existing) {
      // A deleted document that never reached the server needs no tombstone.
      if (!_deleted) {
        await ctx.db.insert(table, {
          ownerId,
          clientId,
          deleted: false,
          updatedAt: await nextUpdatedAt(ctx, ownerId),
          ...fields,
        } as never);
      }
      continue;
    }

    const master = await ctx.db.get(table, rowId(existing._id));
    if (!master || !sameVersion(master as unknown as Doc<ReplicatedTable>, row.assumedMasterState)) {
      if (master) conflicts.push(toReplicationDoc(master as unknown as Doc<T>));
      continue;
    }
    await ctx.db.patch(table, rowId(existing._id), {
      ...fields,
      deleted: Boolean(_deleted),
      updatedAt: await nextUpdatedAt(ctx, ownerId),
    } as never);
  }
  return conflicts;
}

/** Allocate a unique, server-owned version for this owner's next replicated write. */
export async function nextUpdatedAt(ctx: MutationCtx, ownerId: string): Promise<number> {
  const clock = await ctx.db
    .query("syncClocks")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
    .unique();
  const updatedAt = Math.max(Date.now(), (clock?.updatedAt ?? 0) + 1);
  if (clock) await ctx.db.patch("syncClocks", clock._id, { updatedAt });
  else await ctx.db.insert("syncClocks", { ownerId, updatedAt });
  return updatedAt;
}

/** Offline clients mint ids; an ordinary REST create gets one here. */
export const clientIdFor = (clientId?: string): string => clientId ?? crypto.randomUUID();

function toReplicationDoc<T extends ReplicatedTable>(doc: Doc<T>): ReplicationDoc<T> {
  const { _id, _creationTime, ownerId: _ownerId, deleted, ...replicated } = doc as unknown as Doc<"customers">;
  return { ...replicated, _deleted: Boolean(deleted) } as unknown as ReplicationDoc<T>;
}

function sameVersion(master: { clientId: string; updatedAt: number; deleted?: boolean }, assumed: unknown): boolean {
  if (typeof assumed !== "object" || assumed === null) return false;
  const version = assumed as Partial<{ clientId: string; updatedAt: number; _deleted: boolean }>;
  return (
    version.clientId === master.clientId &&
    version.updatedAt === master.updatedAt &&
    version._deleted === Boolean(master.deleted)
  );
}
