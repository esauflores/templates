import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "@/_generated/server";
import { requireUserId, requireWriter } from "@/infrastructure/identity/auth";
import { clampLimit, requireOwned } from "@/infrastructure/lib/db";
import {
  clientIdFor,
  type PushRow,
  nextUpdatedAt,
  pullChanges,
  pushChanges,
  vCheckpoint,
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
const editable = writable.omit("clientId", "updatedAt", "deleted");
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
      // eslint-disable-next-line convex/no-filter-in-query -- temporary legacy-field compatibility during rollout
      .filter((q) => q.neq(q.field("deleted"), true))
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
      // eslint-disable-next-line convex/no-filter-in-query -- temporary legacy-field compatibility during rollout
      .filter((q) => q.neq(q.field("deleted"), true))
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
    return found && found.ownerId === ownerId && !found.deleted ? found : null;
  },
});

export const create = mutation({
  args: editable.fields,
  returns: doc,
  handler: async (ctx, args) => {
    const ownerId = await requireWriter(ctx);
    const id = await ctx.db.insert("customers", {
      ownerId,
      clientId: clientIdFor(),
      deleted: false,
      updatedAt: await nextUpdatedAt(ctx, ownerId),
      ...args,
    });
    return await requireOwned(ctx, "customers", id, ownerId);
  },
});

export const update = mutation({
  args: { id: v.id("customers"), ...editable.partial().fields },
  returns: doc,
  handler: async (ctx, { id, ...patch }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "customers", id, ownerId);
    await ctx.db.patch("customers", id, { ...patch, updatedAt: await nextUpdatedAt(ctx, ownerId) });
    return await requireOwned(ctx, "customers", id, ownerId);
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "customers", id, ownerId);
    await ctx.db.patch("customers", id, { deleted: true, updatedAt: await nextUpdatedAt(ctx, ownerId) });
    return null;
  },
});

// --- offline replication (see infrastructure/replication/) ---------------

const replicated = editable.extend({ clientId: v.string(), updatedAt: v.number(), _deleted: v.boolean() });

export const pull = query({
  args: { checkpoint: vCheckpoint, limit: v.number() },
  returns: v.object({ documents: v.array(replicated), checkpoint: vCheckpoint }),
  handler: (ctx, { checkpoint, limit }) => pullChanges(ctx, "customers", checkpoint, limit),
});

export const push = mutation({
  args: {
    changeRows: v.array(v.object({ newDocumentState: replicated, assumedMasterState: v.optional(replicated) })),
  },
  returns: v.array(replicated),
  handler: (ctx, { changeRows }) => pushChanges(ctx, "customers", changeRows as PushRow<"customers">[]),
});
