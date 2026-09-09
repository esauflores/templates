import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "@/_generated/server";
import { requireUserId, requireWriter } from "@/infrastructure/identity/auth";
import { clampLimit, requireOwned } from "@/infrastructure/lib/db";
import {
  type PushRow,
  pullChanges,
  pushChanges,
  stampCreate,
  stampUpdate,
  vCheckpoint,
  vTombstone,
  writeTombstone,
} from "@/infrastructure/replication/replication";
import schema from "@/schema";

import { salesTables } from "./tables";

/**
 * The simplest resource — copy this file when adding a flat one.
 *
 * Field shapes are *derived*, never re-typed: `writable` is the table validator
 * minus the server-owned `ownerId`, `editable` drops the replication bookkeeping
 * (`clientId`, `updatedAt`) the server owns, and `doc` is the table validator
 * plus the `_id`/`_creationTime` system fields. Adding a column to `tables.ts`
 * flows into this module's `args` and `returns` with no edit here.
 */
const writable = salesTables.customers.validator.omit("ownerId");
const editable = writable.omit("clientId", "updatedAt");
const doc = schema.doc("customers");

/** Newest first, capped. Use `paginated` for anything that can grow unbounded. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(doc),
  handler: async (ctx, { limit }) => {
    const ownerId = await requireUserId(ctx);
    return await ctx.db
      .query("customers")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .take(clampLimit(limit));
  },
});

export const paginated = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(doc),
  handler: async (ctx, { paginationOpts }) => {
    const ownerId = await requireUserId(ctx);
    return await ctx.db
      .query("customers")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

/** `null` rather than a throw: "no such customer for you" is an expected answer. */
export const get = query({
  args: { id: v.id("customers") },
  returns: v.union(doc, v.null()),
  handler: async (ctx, { id }) => {
    const ownerId = await requireUserId(ctx);
    const found = await ctx.db.get("customers", id);
    return found && found.ownerId === ownerId ? found : null;
  },
});

export const create = mutation({
  // `clientId` is optional: an offline client mints one, a plain REST call omits it.
  args: { ...editable.fields, clientId: v.optional(v.string()) },
  returns: doc,
  handler: async (ctx, { clientId, ...args }) => {
    const ownerId = await requireWriter(ctx);
    const id = await ctx.db.insert("customers", { ownerId, ...args, ...stampCreate(clientId) });
    return await requireOwned(ctx, "customers", id, ownerId);
  },
});

export const update = mutation({
  args: { id: v.id("customers"), ...editable.partial().fields },
  returns: doc,
  handler: async (ctx, { id, ...patch }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "customers", id, ownerId);
    await ctx.db.patch("customers", id, { ...patch, ...stampUpdate() });
    return await requireOwned(ctx, "customers", id, ownerId);
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const ownerId = await requireWriter(ctx);
    const row = await requireOwned(ctx, "customers", id, ownerId);
    // Tombstone first, so an offline client learns the row is gone on next pull.
    await writeTombstone(ctx, "customers", ownerId, row.clientId);
    await ctx.db.delete("customers", id);
    return null;
  },
});

// --- offline replication (see infrastructure/replication/) ---------------

const pulled = v.union(doc.extend({ _deleted: v.literal(false) }), vTombstone);
const pushable = editable.extend({ clientId: v.string(), updatedAt: v.number(), _deleted: v.optional(v.boolean()) });

export const pull = query({
  args: { checkpoint: vCheckpoint, limit: v.number() },
  returns: v.object({ documents: v.array(pulled), checkpoint: vCheckpoint }),
  handler: (ctx, { checkpoint, limit }) => pullChanges(ctx, "customers", checkpoint, limit),
});

export const push = mutation({
  args: {
    changeRows: v.array(v.object({ newDocumentState: pushable, assumedMasterState: v.optional(pushable) })),
  },
  returns: v.array(pulled),
  handler: (ctx, { changeRows }) => pushChanges(ctx, "customers", changeRows as PushRow<"customers">[]),
});
