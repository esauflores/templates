import { createThread } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "@/_generated/api";
import { mutation } from "@/_generated/server";
import { requireWriter } from "@/infrastructure/identity/auth";

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
