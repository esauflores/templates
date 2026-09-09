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

import { supportTables } from "./tables";

const writable = supportTables.tickets.validator.omit("ownerId");
const editable = writable.omit("clientId", "updatedAt");
const doc = schema.doc("tickets");

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(doc),
  handler: async (ctx, { limit }) => {
    const ownerId = await requireUserId(ctx);
    return await ctx.db
      .query("tickets")
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
      .query("tickets")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("tickets") },
  returns: v.union(doc, v.null()),
  handler: async (ctx, { id }) => {
    const ownerId = await requireUserId(ctx);
    const found = await ctx.db.get("tickets", id);
    return found && found.ownerId === ownerId ? found : null;
  },
});

export const create = mutation({
  args: { ...editable.fields, clientId: v.optional(v.string()) },
  returns: doc,
  handler: async (ctx, { clientId, ...args }) => {
    const ownerId = await requireWriter(ctx);
    const id = await ctx.db.insert("tickets", { ownerId, ...args, ...stampCreate(clientId) });
    return await requireOwned(ctx, "tickets", id, ownerId);
  },
});

export const update = mutation({
  args: { id: v.id("tickets"), ...editable.partial().fields },
  returns: doc,
  handler: async (ctx, { id, ...patch }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "tickets", id, ownerId);
    await ctx.db.patch("tickets", id, { ...patch, ...stampUpdate() });
    return await requireOwned(ctx, "tickets", id, ownerId);
  },
});

export const remove = mutation({
  args: { id: v.id("tickets") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const ownerId = await requireWriter(ctx);
    const row = await requireOwned(ctx, "tickets", id, ownerId);
    await writeTombstone(ctx, "tickets", ownerId, row.clientId);
    await ctx.db.delete("tickets", id);
    return null;
  },
});

// --- offline replication (see infrastructure/replication/) ---------------

const pulled = v.union(doc.extend({ _deleted: v.literal(false) }), vTombstone);
const pushable = editable.extend({ clientId: v.string(), updatedAt: v.number(), _deleted: v.optional(v.boolean()) });

export const pull = query({
  args: { checkpoint: vCheckpoint, limit: v.number() },
  returns: v.object({ documents: v.array(pulled), checkpoint: vCheckpoint }),
  handler: (ctx, { checkpoint, limit }) => pullChanges(ctx, "tickets", checkpoint, limit),
});

export const push = mutation({
  args: {
    changeRows: v.array(v.object({ newDocumentState: pushable, assumedMasterState: v.optional(pushable) })),
  },
  returns: v.array(pulled),
  handler: (ctx, { changeRows }) => pushChanges(ctx, "tickets", changeRows as PushRow<"tickets">[]),
});
