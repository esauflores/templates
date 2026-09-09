import { defineTable } from "convex/server";
import { v } from "convex/values";

export const identityTables = {
  /** Mirror of Clerk users, kept in sync by the `/webhooks/clerk` handler. */
  users: defineTable({
    clerkId: v.string(), // the Clerk user id — also the JWT `sub` / every row's `ownerId`
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  }).index("by_clerkId", ["clerkId"]),
};
