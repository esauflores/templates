import { defineTable } from "convex/server";
import { v } from "convex/values";

import { replicatedFields } from "@/infrastructure/replication/tables";

/** `tickets` is flat and offline-replicated — see `infrastructure/replication/`. */
export const supportTables = {
  tickets: defineTable({
    ownerId: v.string(),
    subject: v.string(),
    body: v.string(),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent")),
    status: v.union(v.literal("open"), v.literal("pending"), v.literal("closed")),
    assignee: v.optional(v.string()),
    ...replicatedFields,
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_clientId", ["ownerId", "clientId"])
    .index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"]),
};
