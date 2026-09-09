import { defineTable } from "convex/server";
import { v } from "convex/values";

import { replicatedFields } from "@/infrastructure/replication/tables";

/** `projects` is flat and offline-replicated — see `infrastructure/replication/`. */
export const workspaceTables = {
  projects: defineTable({
    ownerId: v.string(),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("archived"), v.literal("completed")),
    startedAt: v.optional(v.number()),
    ...replicatedFields,
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_clientId", ["ownerId", "clientId"])
    .index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"]),
};
