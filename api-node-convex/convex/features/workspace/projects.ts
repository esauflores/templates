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

import { workspaceTables } from "./tables";

const writable = workspaceTables.projects.validator.omit("ownerId");
const editable = writable.omit("clientId", "updatedAt", "deleted");
const doc = schema.doc("projects");

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(doc),
  handler: async (ctx, { limit }) => {
    const ownerId = await requireUserId(ctx);
    return await ctx.db
      .query("projects")
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
      .query("projects")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      // eslint-disable-next-line convex/no-filter-in-query -- temporary legacy-field compatibility during rollout
      .filter((q) => q.neq(q.field("deleted"), true))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("projects") },
  returns: v.union(doc, v.null()),
  handler: async (ctx, { id }) => {
    const ownerId = await requireUserId(ctx);
    const found = await ctx.db.get("projects", id);
    return found && found.ownerId === ownerId && !found.deleted ? found : null;
  },
});

export const create = mutation({
  args: editable.fields,
  returns: doc,
  handler: async (ctx, args) => {
    const ownerId = await requireWriter(ctx);
    const id = await ctx.db.insert("projects", {
      ownerId,
      clientId: clientIdFor(),
      deleted: false,
      updatedAt: await nextUpdatedAt(ctx, ownerId),
      ...args,
    });
    return await requireOwned(ctx, "projects", id, ownerId);
  },
});

export const update = mutation({
  args: { id: v.id("projects"), ...editable.partial().fields },
  returns: doc,
  handler: async (ctx, { id, ...patch }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "projects", id, ownerId);
    await ctx.db.patch("projects", id, { ...patch, updatedAt: await nextUpdatedAt(ctx, ownerId) });
    return await requireOwned(ctx, "projects", id, ownerId);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "projects", id, ownerId);
    await ctx.db.patch("projects", id, { deleted: true, updatedAt: await nextUpdatedAt(ctx, ownerId) });
    return null;
  },
});

// --- offline replication (see infrastructure/replication/) ---------------

const replicated = editable.extend({ clientId: v.string(), updatedAt: v.number(), _deleted: v.boolean() });

export const pull = query({
  args: { checkpoint: vCheckpoint, limit: v.number() },
  returns: v.object({ documents: v.array(replicated), checkpoint: vCheckpoint }),
  handler: (ctx, { checkpoint, limit }) => pullChanges(ctx, "projects", checkpoint, limit),
});

export const push = mutation({
  args: {
    changeRows: v.array(v.object({ newDocumentState: replicated, assumedMasterState: v.optional(replicated) })),
  },
  returns: v.array(replicated),
  handler: (ctx, { changeRows }) => pushChanges(ctx, "projects", changeRows as PushRow<"projects">[]),
});
