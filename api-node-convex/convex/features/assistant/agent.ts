import { Agent, getThreadMetadata } from "@convex-dev/agent";

import { components } from "@/_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "@/_generated/server";
import { notFound } from "@/infrastructure/lib/errors";

import { chatModel } from "./model";

/**
 * A chat assistant over `@convex-dev/agent`.
 *
 * The component owns the thread and message tables, so there's nothing to add
 * to `convex/schema.ts` — history, ordering and (optionally) vector search over
 * past messages come with it. That's also why authorization needs its own
 * helper below: `requireOwned` works on this app's tables, and these rows aren't
 * in them.
 *
 * No `textEmbeddingModel` is configured, so the agent sends recent messages as
 * context rather than doing hybrid vector search over the whole history. Add
 * `textEmbeddingModel: mistral.textEmbeddingModel("mistral-embed")` in
 * `model.ts` to turn that on.
 */
export const assistant = new Agent(components.agent, {
  name: "sales-assistant",
  languageModel: chatModel,
  instructions: [
    "You are a concise assistant embedded in a sales back-office API.",
    "Answer in plain prose, at most a short paragraph.",
    "If you are asked about specific records, say that you cannot see them yet.",
  ].join(" "),
});

/**
 * Confirm a thread belongs to the caller, else throw `NOT_FOUND`.
 *
 * The component keys threads by the `userId` handed to `createThread` — this
 * template passes the Clerk subject, the same value every other table stores as
 * `ownerId`. A thread owned by somebody else is reported as missing, matching
 * `requireOwned` so the id space doesn't leak across tenants.
 *
 * Every thread-scoped function starts with this. Skipping it would let any
 * authenticated caller read or continue any conversation, since a `threadId` is
 * just a string as far as the arg validator is concerned.
 */
export async function authorizeThread(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: string,
  ownerId: string,
): Promise<void> {
  // Throws rather than returning null when the id doesn't exist at all.
  const thread = await getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null);
  if (!thread || thread.userId !== ownerId) throw notFound("Thread not found");
}
