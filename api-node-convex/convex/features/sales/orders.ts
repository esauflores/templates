import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "@/_generated/dataModel";
import { type QueryCtx, mutation, query } from "@/_generated/server";
import { requireUserId, requireWriter } from "@/infrastructure/identity/auth";
import { clampLimit, requireOwned } from "@/infrastructure/lib/db";
import schema from "@/schema";

import { orderTotals } from "./aggregates";
import { expandOrder, orderDetail, orderItemInput, priceOrder } from "./model";
import { salesTables } from "./tables";

const writable = salesTables.orders.validator.omit("ownerId");
const doc = schema.doc("orders");

/**
 * The caller's orders, newest first, optionally narrowed to one customer.
 *
 * Both indexes lead with `ownerId`, so the filtering is tenant-scoped by the
 * index itself: another user's `customerId` yields nothing rather than leaking
 * whether that customer exists.
 */
const ownedOrders = (ctx: QueryCtx, ownerId: string, customerId?: Id<"customers">) =>
  (customerId
    ? ctx.db
        .query("orders")
        .withIndex("by_ownerId_and_customerId", (q) => q.eq("ownerId", ownerId).eq("customerId", customerId))
    : ctx.db.query("orders").withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
  ).order("desc");

export const list = query({
  args: { limit: v.optional(v.number()), customerId: v.optional(v.id("customers")) },
  returns: v.array(doc),
  handler: async (ctx, { limit, customerId }) => {
    const ownerId = await requireUserId(ctx);
    return await ownedOrders(ctx, ownerId, customerId).take(clampLimit(limit));
  },
});

export const paginated = query({
  args: { paginationOpts: paginationOptsValidator, customerId: v.optional(v.id("customers")) },
  returns: paginationResultValidator(doc),
  handler: async (ctx, { paginationOpts, customerId }) => {
    const ownerId = await requireUserId(ctx);
    return await ownedOrders(ctx, ownerId, customerId).paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("orders") },
  returns: v.union(orderDetail, v.null()),
  handler: async (ctx, { id }) => {
    const ownerId = await requireUserId(ctx);
    const order = await ctx.db.get("orders", id);
    if (!order || order.ownerId !== ownerId) return null;
    return await expandOrder(ctx, order);
  },
});

/**
 * `lineItems` and `totalCents` are absent from the args on purpose: the caller
 * sends `{ productId, quantity }` and the server prices the order (see
 * `model.priceOrder`), so a client can't invent its own totals.
 */
export const create = mutation({
  args: {
    customerId: writable.fields.customerId,
    items: v.array(orderItemInput),
    status: v.optional(writable.fields.status),
  },
  returns: doc,
  handler: async (ctx, { customerId, items, status }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "customers", customerId, ownerId);
    const { lineItems, totalCents } = await priceOrder(ctx, ownerId, items);

    const id = await ctx.db.insert("orders", {
      ownerId,
      customerId,
      lineItems,
      totalCents,
      status: status ?? "pending",
    });
    const created = await requireOwned(ctx, "orders", id, ownerId);
    // Same transaction as the insert, so the row and the running total can't diverge.
    await orderTotals.insert(ctx, created);
    return created;
  },
});

/** Line items are immutable once placed (re-order to change them); only the status transitions. */
export const update = mutation({
  args: { id: v.id("orders"), status: writable.fields.status },
  returns: doc,
  handler: async (ctx, { id, status }) => {
    const ownerId = await requireWriter(ctx);
    const before = await requireOwned(ctx, "orders", id, ownerId);
    await ctx.db.patch("orders", id, { status });
    const after = await requireOwned(ctx, "orders", id, ownerId);
    // `replace` needs both versions: the old one to find the tree node, the new
    // one to re-key and re-sum it.
    await orderTotals.replace(ctx, before, after);
    return after;
  },
});

export const remove = mutation({
  args: { id: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const ownerId = await requireWriter(ctx);
    const order = await requireOwned(ctx, "orders", id, ownerId);
    await ctx.db.delete("orders", id);
    await orderTotals.delete(ctx, order);
    return null;
  },
});

/**
 * Order count and revenue for the caller, without reading a single order row.
 *
 * `since` narrows to a `_creationTime` lower bound — the reason the aggregate is
 * keyed by creation time rather than just counted.
 */
export const stats = query({
  args: { since: v.optional(v.number()) },
  returns: v.object({ count: v.number(), totalCents: v.number() }),
  handler: async (ctx, { since }) => {
    const ownerId = await requireUserId(ctx);
    const opts = {
      namespace: ownerId,
      bounds: since === undefined ? undefined : { lower: { key: since, inclusive: true } },
    };
    const [count, totalCents] = await Promise.all([orderTotals.count(ctx, opts), orderTotals.sum(ctx, opts)]);
    return { count, totalCents };
  },
});
