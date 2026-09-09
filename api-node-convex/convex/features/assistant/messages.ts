import { listUIMessages, vPaginationResult } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "@/_generated/api";
import { action, internalMutation, query } from "@/_generated/server";
import { requireUserId } from "@/infrastructure/identity/auth";
import { limitAi } from "@/infrastructure/lib/limits";

import { assistant, authorizeThread } from "./agent";

/** The fields a REST caller (or a simple chat UI) actually renders. */
const listedMessage = v.object({
  id: v.string(),
  role: v.string(),
  text: v.string(),
});

/** The thread's history. Full UIMessage objects stay in the component; this is the projection. */
export const list = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
  returns: vPaginationResult(listedMessage),
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    await authorizeThread(ctx, args.threadId, ownerId);
    const page = await listUIMessages(ctx, components.agent, args);
    return {
      ...page,
      page: page.page.map((message) => ({ id: message.id, role: message.role, text: message.text })),
    };
  },
});

/**
 * Spend one LLM token.
 *
 * This exists because `ask` is an action, and the rate limiter needs a
 * `MutationCtx` to keep the spend transactional. Internal, so the `ownerId`
 * argument is only ever supplied by already-authenticated server code.
 */
export const reserveAiBudget = internalMutation({
  args: { ownerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { ownerId }) => {
    await limitAi(ctx, ownerId);
    return null;
  },
});

/**
 * Send a prompt and get the reply, synchronously.
 *
 * An `action` because calling a model is network I/O, which mutations can't do.
 * The agent saves both the prompt and the response into the thread itself, so
 * there's no message bookkeeping here.
 *
 * Order matters: authorize, then reserve budget, then call the model — so an
 * unauthorized or throttled request never reaches the provider. For a chat UI
 * you'd swap `generateText` for `assistant.streamText` and subscribe to `list`,
 * which is the payoff of the messages living in Convex.
 */
export const ask = action({
  args: { threadId: v.string(), prompt: v.string() },
  returns: v.object({ text: v.string() }),
  handler: async (ctx, { threadId, prompt }) => {
    const ownerId = await requireUserId(ctx);
    await authorizeThread(ctx, threadId, ownerId);
    await ctx.runMutation(internal.features.assistant.messages.reserveAiBudget, { ownerId });

    const result = await assistant.generateText(ctx, { threadId, userId: ownerId }, { prompt });
    return { text: result.text };
  },
});
