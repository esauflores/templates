import { Workpool } from "@convex-dev/workpool";
import { v } from "convex/values";

import { components, internal } from "@/_generated/api";
import type { DataModel } from "@/_generated/dataModel";
import { type MutationCtx, internalAction } from "@/_generated/server";

/**
 * Outbound webhook delivery — the template's one piece of background work, and
 * its example of the third function kind (`action`).
 *
 * Actions are the only functions allowed to reach the outside world, and unlike
 * mutations they are **not** transactional: a `fetch` that half-succeeds isn't
 * rolled back. So the mutation commits first and merely *enqueues* the delivery.
 *
 * Why a workpool instead of `ctx.scheduler.runAfter`, which is built in and
 * free: the scheduler runs everything it's given at once and gives up on the
 * first failure. The pool caps concurrency, so a burst of deliveries can't
 * starve the rest of the deployment or trip the receiver's own rate limits, and
 * it retries with exponential backoff. Each `app.use(workpool, { name })` in
 * `convex.config.ts` is a separate queue with its own budget — add a second pool
 * rather than raising `maxParallelism` here, so unrelated workloads stay isolated.
 */
const pool = new Workpool(components.notifications, {
  maxParallelism: 5,
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 4, initialBackoffMs: 500, base: 2 },
  // Default is REPORT, which prints a throughput summary on every loop tick.
  // WARN keeps failures visible without burying the logs (or the test output).
  logLevel: "WARN",
});

/**
 * POST one event to the configured endpoint.
 *
 * Retries are only safe because this is idempotent from the receiver's side: the
 * `Idempotency-Key` identifies the *state transition*, not the attempt, so a
 * replay after a timeout is recognisable as a duplicate. Work that can't offer
 * that guarantee — sending an email, charging a card without a transaction id —
 * must be enqueued with `retry: false` instead.
 *
 * Throwing is what marks the attempt failed and triggers the backoff.
 */
export const deliver = internalAction({
  args: { event: v.string(), idempotencyKey: v.string(), body: v.string() },
  returns: v.union(v.literal("delivered"), v.literal("skipped")),
  handler: async (_ctx, { event, idempotencyKey, body }) => {
    const endpoint = process.env.OUTBOUND_WEBHOOK_URL;
    // Unconfigured is a valid state, not a failure — don't burn retries on it.
    if (!endpoint) return "skipped";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
        "x-event-type": event,
      },
      body,
    });
    if (!response.ok) throw new Error(`Webhook endpoint returned ${response.status}`);
    return "delivered";
  },
});

/**
 * Runs once the work is finished, whichever way it went — including after the
 * final retry is exhausted, which is the only place a permanent failure becomes
 * visible. It's a separate transaction from `deliver`, so a real app would write
 * an audit row here rather than only logging.
 */
const deliveryContext = v.object({ event: v.string(), idempotencyKey: v.string() });

export const deliveryFinished = pool.defineOnComplete<DataModel, typeof deliveryContext>({
  context: deliveryContext,
  handler: async (_ctx, { context, result }) => {
    if (result.kind === "failed") {
      console.error(`Webhook ${context.event} (${context.idempotencyKey}) gave up:`, result.error);
    }
  },
});

/**
 * Queue a delivery from inside a mutation; commits with the surrounding
 * transaction, so a mutation that later throws sends nothing.
 *
 * The body is serialised here rather than in the action because the work
 * argument has to be a stored Convex value, and a JSON string keeps that
 * precise — no `v.any()` payload to validate loosely at the boundary.
 */
export async function enqueueDelivery(
  ctx: MutationCtx,
  args: { event: string; idempotencyKey: string; payload: unknown },
): Promise<void> {
  await pool.enqueueAction(
    ctx,
    internal.infrastructure.jobs.webhooks.deliver,
    {
      event: args.event,
      idempotencyKey: args.idempotencyKey,
      // Self-describing envelope, so a receiver can route on the body alone.
      body: JSON.stringify({ event: args.event, payload: args.payload }),
    },
    {
      onComplete: internal.infrastructure.jobs.webhooks.deliveryFinished,
      context: { event: args.event, idempotencyKey: args.idempotencyKey },
    },
  );
}
