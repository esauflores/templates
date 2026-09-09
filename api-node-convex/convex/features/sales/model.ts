import { v } from "convex/values";

import type { Doc, Id } from "@/_generated/dataModel";
import type { QueryCtx } from "@/_generated/server";
import { requireOwned } from "@/infrastructure/lib/db";
import { invalidArgument } from "@/infrastructure/lib/errors";
import schema from "@/schema";

/**
 * Sales business logic, as plain TypeScript over a `ctx`.
 *
 * Convex's guidance is to keep `query`/`mutation`/`action` wrappers thin and put
 * the real work in functions like these: they're unit-testable, shareable
 * between a public and an internal entry point, and callable without the
 * overhead of `ctx.runQuery`.
 *
 * A `model.ts` only appears in features that have logic beyond owner-scoped
 * CRUD — `workspace` and `support` don't need one.
 */

export type OrderItemInput = { productId: Id<"products">; quantity: number };
type OrderLine = Doc<"orders">["lineItems"][number];

/** Callers send `{ productId, quantity }`; the unit price is snapshotted server-side. */
export const orderItemInput = v.object({ productId: v.id("products"), quantity: v.number() });

/** An invoice with its customer resolved. */
export const invoiceDetail = schema.doc("invoices").extend({
  customer: v.union(schema.doc("customers"), v.null()),
});

/** An order with its customer and each line item's product resolved. */
export const orderDetail = schema.doc("orders").extend({
  customer: v.union(schema.doc("customers"), v.null()),
  lineItems: v.array(
    orderItemInput.extend({
      unitPriceCents: v.number(),
      product: v.union(schema.doc("products"), v.null()),
    }),
  ),
});

/**
 * Price an order server-side. Every product must belong to the caller, and the
 * unit price is copied onto the line so a later price change can't retroactively
 * move a placed order's total.
 */
export async function priceOrder(
  ctx: QueryCtx,
  ownerId: string,
  items: readonly OrderItemInput[],
): Promise<{ lineItems: OrderLine[]; totalCents: number }> {
  if (items.length === 0) throw invalidArgument("An order needs at least one line item");

  const lineItems: OrderLine[] = [];
  let totalCents = 0;

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw invalidArgument("Quantity must be a positive integer");
    }
    const product = await requireOwned(ctx, "products", item.productId, ownerId);
    lineItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPriceCents: product.priceCents,
    });
    totalCents += item.quantity * product.priceCents;
  }

  return { lineItems, totalCents };
}

/** Resolve an invoice's customer for a detail read. */
export async function expandInvoice(ctx: QueryCtx, invoice: Doc<"invoices">) {
  return { ...invoice, customer: await ctx.db.get("customers", invoice.customerId) };
}

/** Resolve an order's customer and per-line products for a detail read. */
export async function expandOrder(ctx: QueryCtx, order: Doc<"orders">) {
  const [customer, lineItems] = await Promise.all([
    ctx.db.get("customers", order.customerId),
    Promise.all(
      order.lineItems.map(async (line) => ({ ...line, product: await ctx.db.get("products", line.productId) })),
    ),
  ]);
  return { ...order, customer, lineItems };
}
