import { createThread, vPaginationResult, vThreadDoc } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components } from "@/_generated/api";
import { mutation, query } from "@/_generated/server";
import { requireUserId, requireWriter } from "@/infrastructure/identity/auth";

import { assistant, authorizeThread } from "./agent";

/**
 * Conversation threads. These live in the agent component's tables, so the
 * usual `list`/`paginated` shape from the CRUD modules doesn't apply — reads go
 * through the component's own queries.
 */

export const create = mutation({
  args: { title: v.optional(v.string()) },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, { title }) => {
    const ownerId = await requireWriter(ctx);
    // `userId` is what makes the thread the caller's — see `authorizeThread`.
    const threadId = await createThread(ctx, components.agent, { userId: ownerId, title });
    return { threadId };
  },
});

/** The caller's threads, newest first. Scoped by the component, not by an index here. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: vPaginationResult(vThreadDoc),
  handler: async (ctx, { paginationOpts }) => {
    const ownerId = await requireUserId(ctx);
    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: ownerId,
      paginationOpts,
    });
  },
});

export const remove = mutation({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const ownerId = await requireWriter(ctx);
    await authorizeThread(ctx, threadId, ownerId);
    // Async: deleting a long conversation is more work than one transaction
    // should carry, so the component pages through it in the background.
    await assistant.deleteThreadAsync(ctx, { threadId });
    return null;
  },
});
