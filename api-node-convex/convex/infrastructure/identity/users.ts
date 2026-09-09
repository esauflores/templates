import { v } from "convex/values";

import { internalMutation, query } from "@/_generated/server";
import schema from "@/schema";

import { requireUserId } from "./auth";
import { identityTables } from "./tables";

/**
 * The `users` table mirrors Clerk. It's kept current by the `/webhooks/clerk`
 * HTTP handler (`http.ts`), which calls the `internal*` mutations here on
 * `user.created` / `user.updated` / `user.deleted`. Clerk is still the source of
 * truth — this copy is for joins and app-side profile data.
 *
 * There is deliberately no `users.list`: with no org or membership model, any
 * such query would hand every user's email to every authenticated caller. Add it
 * back alongside a `memberships` table that can scope it.
 */
const doc = schema.doc("users");

/** The signed-in caller's row, or `null` if the webhook hasn't landed yet. */
export const current = query({
  args: {},
  returns: v.union(doc, v.null()),
  handler: async (ctx) => {
    const clerkId = await requireUserId(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

const writable = identityTables.users.validator.omit("clerkId");

export const upsertFromClerk = internalMutation({
  args: { clerkId: v.string(), ...writable.fields },
  returns: v.null(),
  handler: async (ctx, { clerkId, ...fields }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (existing) await ctx.db.patch("users", existing._id, fields);
    else await ctx.db.insert("users", { clerkId, ...fields });
    return null;
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkId }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (existing) await ctx.db.delete("users", existing._id);
    return null;
  },
});
