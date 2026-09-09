import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc } from "@/_generated/dataModel";
import { type QueryCtx, internalMutation, mutation, query } from "@/_generated/server";
import { requireUploader, requireUserId, requireWriter } from "@/infrastructure/identity/auth";
import { clampLimit, requireOwned } from "@/infrastructure/lib/db";
import { conflict, notFound } from "@/infrastructure/lib/errors";
import schema from "@/schema";

/**
 * Uploads live in Convex's built-in `_storage`; this table only records who owns
 * which blob and under what name.
 *
 * `contentType` and `size` are read back from the `_storage` system document
 * rather than stored here, because the backend derives them from the actual
 * bytes — a client-supplied size or MIME type would just be a claim.
 */
const fileView = schema.doc("files").extend({
  contentType: v.union(v.string(), v.null()),
  size: v.number(),
  url: v.union(v.string(), v.null()),
});

/**
 * A download URL is an unauthenticated bearer credential: anyone holding it can
 * fetch the bytes without passing through these functions again, and the only
 * way to revoke it is to delete the blob. Hand them to the owner, not into
 * shared or long-lived storage.
 */
async function withMetadata(ctx: QueryCtx, doc: Doc<"files">) {
  const [blob, url] = await Promise.all([
    ctx.db.system.get("_storage", doc.storageId),
    ctx.storage.getUrl(doc.storageId),
  ]);
  return { ...doc, contentType: blob?.contentType ?? null, size: blob?.size ?? 0, url };
}

/**
 * Browser upload, step 1: a short-lived URL the client POSTs the bytes to. The
 * response body is the new `storageId`; pass it to `save`. (Non-Convex callers
 * use `POST /files` in `http.ts` instead — one raw request, no round-trip.)
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Handing out a URL is cheap; the upload budget is spent in `save`, so both
    // this flow and the raw `POST /files` one cost exactly one upload token.
    await requireWriter(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Claim an uploaded blob as an owned file. */
export const save = mutation({
  args: { storageId: v.id("_storage"), name: v.string() },
  returns: fileView,
  handler: async (ctx, { storageId, name }) => {
    const ownerId = await requireUploader(ctx);

    // `v.id("_storage")` only checks the id's shape, not that a blob is there.
    const blob = await ctx.db.system.get("_storage", storageId);
    if (!blob) throw notFound("Uploaded file not found");

    // One owner per blob. Without this, a caller who learned another user's
    // storage id could register it as their own and then `remove` it, deleting
    // bytes still referenced by the original owner's row.
    const claimed = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .unique();
    if (claimed) throw conflict("This upload has already been saved");

    const id = await ctx.db.insert("files", { ownerId, storageId, name });
    return await withMetadata(ctx, await requireOwned(ctx, "files", id, ownerId));
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(fileView),
  handler: async (ctx, { limit }) => {
    const ownerId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("files")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .take(clampLimit(limit));
    return await Promise.all(rows.map((doc) => withMetadata(ctx, doc)));
  },
});

/** As `list`, cursor-based — what `GET /files` serves, so the route matches every other collection. */
export const paginated = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(fileView),
  handler: async (ctx, { paginationOpts }) => {
    const ownerId = await requireUserId(ctx);
    const page = await ctx.db
      .query("files")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((doc) => withMetadata(ctx, doc))) };
  },
});

export const get = query({
  args: { id: v.id("files") },
  returns: v.union(fileView, v.null()),
  handler: async (ctx, { id }) => {
    const ownerId = await requireUserId(ctx);
    const found = await ctx.db.get("files", id);
    if (!found || found.ownerId !== ownerId) return null;
    return await withMetadata(ctx, found);
  },
});

/** Deletes the row *and* the blob — safe because `save` enforces a single owner. */
export const remove = mutation({
  args: { id: v.id("files") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const ownerId = await requireWriter(ctx);
    const doc = await requireOwned(ctx, "files", id, ownerId);
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete("files", id);
    return null;
  },
});

/** One transaction's worth of blobs. `scanned === SWEEP_BATCH` means there may be more. */
const SWEEP_BATCH = 200;

/**
 * Delete blobs nobody claimed — the job behind `crons.ts`.
 *
 * `generateUploadUrl` necessarily hands out a URL before there's a row to point
 * at it, so a client that uploads and then never calls `save` (closed the tab,
 * failed validation, gave up) leaves bytes in `_storage` that no row references,
 * no query can see, and nothing collects. They just accrue storage cost.
 *
 * `graceMs` is what keeps this safe: only blobs older than the cutoff are
 * considered, so an upload still mid-flight toward its `save` is never touched.
 * Internal, and takes no `ownerId` — it deliberately looks across all tenants,
 * which is exactly why no client may call it.
 */
export const sweepUnclaimedUploads = internalMutation({
  args: { graceMs: v.number() },
  returns: v.object({ scanned: v.number(), deleted: v.number() }),
  handler: async (ctx, { graceMs }) => {
    // `Date.now()` is fine here and forbidden in a query: a mutation runs once,
    // a query would re-run on every tick and never cache.
    const cutoff = Date.now() - graceMs;

    const blobs = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .take(SWEEP_BATCH);

    let deleted = 0;
    for (const blob of blobs) {
      const claimed = await ctx.db
        .query("files")
        .withIndex("by_storageId", (q) => q.eq("storageId", blob._id))
        .unique();
      if (claimed) continue;
      await ctx.storage.delete(blob._id);
      deleted++;
    }
    return { scanned: blobs.length, deleted };
  },
});
