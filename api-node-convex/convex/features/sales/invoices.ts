import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "@/_generated/dataModel";
import { type QueryCtx, mutation, query } from "@/_generated/server";
import { requireUserId, requireWriter } from "@/infrastructure/identity/auth";
import { enqueueDelivery } from "@/infrastructure/jobs/webhooks";
import { clampLimit, requireOwned } from "@/infrastructure/lib/db";
import schema from "@/schema";

import { expandInvoice, invoiceDetail } from "./model";
import { salesTables } from "./tables";

const writable = salesTables.invoices.validator.omit("ownerId");
const doc = schema.doc("invoices");

/** `status` defaults server-side, so it's optional on create — still derived from the table. */
const createArgs = { ...writable.omit("status").fields, status: v.optional(writable.fields.status) };

/**
 * Filtering by customer uses `by_ownerId_and_customerId`, so the index itself is
 * tenant-scoped: passing another user's `customerId` yields an empty page rather
 * than leaking whether that customer exists.
 */
const ownedInvoices = (ctx: QueryCtx, ownerId: string, customerId?: Id<"customers">) =>
  (customerId
    ? ctx.db
        .query("invoices")
        .withIndex("by_ownerId_and_customerId", (q) => q.eq("ownerId", ownerId).eq("customerId", customerId))
    : ctx.db.query("invoices").withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
  ).order("desc");

export const list = query({
  args: { limit: v.optional(v.number()), customerId: v.optional(v.id("customers")) },
  returns: v.array(doc),
  handler: async (ctx, { limit, customerId }) => {
    const ownerId = await requireUserId(ctx);
    return await ownedInvoices(ctx, ownerId, customerId).take(clampLimit(limit));
  },
});

export const paginated = query({
  args: { paginationOpts: paginationOptsValidator, customerId: v.optional(v.id("customers")) },
  returns: paginationResultValidator(doc),
  handler: async (ctx, { paginationOpts, customerId }) => {
    const ownerId = await requireUserId(ctx);
    return await ownedInvoices(ctx, ownerId, customerId).paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("invoices") },
  returns: v.union(invoiceDetail, v.null()),
  handler: async (ctx, { id }) => {
    const ownerId = await requireUserId(ctx);
    const invoice = await ctx.db.get("invoices", id);
    if (!invoice || invoice.ownerId !== ownerId) return null;
    return await expandInvoice(ctx, invoice);
  },
});

export const create = mutation({
  args: createArgs,
  returns: doc,
  handler: async (ctx, { status, ...args }) => {
    const ownerId = await requireWriter(ctx);
    // Writing a reference, so the target must be proven ours.
    await requireOwned(ctx, "customers", args.customerId, ownerId);
    const id = await ctx.db.insert("invoices", { ownerId, ...args, status: status ?? "draft" });
    return await requireOwned(ctx, "invoices", id, ownerId);
  },
});

export const update = mutation({
  args: { id: v.id("invoices"), ...writable.partial().fields },
  returns: doc,
  handler: async (ctx, { id, ...patch }) => {
    const ownerId = await requireWriter(ctx);
    const before = await requireOwned(ctx, "invoices", id, ownerId);
    if (patch.customerId) await requireOwned(ctx, "customers", patch.customerId, ownerId);
    await ctx.db.patch("invoices", id, patch);
    const after = await requireOwned(ctx, "invoices", id, ownerId);

    // Fire on the *transition* into `paid`, not on every write that leaves it
    // paid, so re-saving an unrelated field doesn't re-notify. The key names the
    // transition too, which is what makes the delivery safe to retry.
    if (before.status !== "paid" && after.status === "paid") {
      await enqueueDelivery(ctx, {
        event: "invoice.paid",
        idempotencyKey: `invoice.paid:${id}`,
        payload: { invoiceId: id, number: after.number, amountCents: after.amountCents },
      });
    }
    return after;
  },
});

export const remove = mutation({
  args: { id: v.id("invoices") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const ownerId = await requireWriter(ctx);
    await requireOwned(ctx, "invoices", id, ownerId);
    await ctx.db.delete("invoices", id);
    return null;
  },
});
