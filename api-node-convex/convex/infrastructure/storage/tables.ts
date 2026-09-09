import { defineTable } from "convex/server";
import { v } from "convex/values";

export const storageTables = {
  /**
   * Ownership rows over Convex's built-in `_storage` — see `storage/files.ts`.
   *
   * `contentType` and `size` are deliberately *not* stored here: they live on the
   * `_storage` system document, which the backend computes from the uploaded
   * bytes. Copying them into this table would mean trusting whatever the client
   * claimed at save time.
   */
  files: defineTable({
    ownerId: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
  })
    .index("by_ownerId", ["ownerId"])
    // Enforces one owner per blob, so `remove` can delete the blob knowing no
    // other row still points at it.
    .index("by_storageId", ["storageId"]),
};
