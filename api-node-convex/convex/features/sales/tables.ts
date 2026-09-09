import { defineTable } from "convex/server";
import { v } from "convex/values";

import { replicatedFields } from "@/infrastructure/replication/tables";

/**
 * Sales tables. Composed into the root schema (`convex/schema.ts`).
 *
 * These validators are the single source of truth for each resource's shape —
 * the function modules derive their `args` and `returns` from them rather than
 * re-declaring the field types (see `customers.ts`).
 *
 * Index naming follows the Convex convention of listing every indexed field, so
 * `by_ownerId_and_customerId` is an index on `["ownerId", "customerId"]`.
 *
 * `customers` and `products` are flat and offline-replicated, so they carry
 * `...replicatedFields` (`clientId`, `updatedAt`) plus the `by_ownerId_and_clientId`
 * (push lookup) and `by_ownerId_and_updatedAt` (pull checkpoint) indexes — see
 * `infrastructure/replication/`. `invoices` and `orders` are not replicated
 * (foreign keys to offline-created parents, server-computed totals).
 */
export const salesTables = {
  customers: defineTable({
    ownerId: v.string(),
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    status: v.union(v.literal("active"), v.literal("churned")),
    ...replicatedFields,
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_clientId", ["ownerId", "clientId"])
    .index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"]),

  products: defineTable({
    ownerId: v.string(),
    name: v.string(),
    sku: v.string(),
    priceCents: v.number(),
    active: v.boolean(),
    ...replicatedFields,
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_clientId", ["ownerId", "clientId"])
    .index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"]),

  invoices: defineTable({
    ownerId: v.string(),
    customerId: v.id("customers"),
    number: v.string(),
    amountCents: v.number(),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid"), v.literal("overdue"), v.literal("void")),
    dueAt: v.optional(v.number()),
  })
    .index("by_ownerId", ["ownerId"])
    // Owner-scoped so a per-customer read can't cross tenants even if the
    // caller's ownership of the customer were never checked.
    .index("by_ownerId_and_customerId", ["ownerId", "customerId"]),

  orders: defineTable({
    ownerId: v.string(),
    customerId: v.id("customers"),
    // Line items snapshot the unit price at order time (products can change later).
    lineItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPriceCents: v.number(),
      }),
    ),
    totalCents: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_customerId", ["ownerId", "customerId"]),
};
