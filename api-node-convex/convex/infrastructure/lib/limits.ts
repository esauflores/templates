import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";

import { components } from "@/_generated/api";
import type { MutationCtx } from "@/_generated/server";

import { rateLimited } from "./errors";

/**
 * Application-layer rate limits, via `@convex-dev/rate-limiter`.
 *
 * Convex has no built-in rate limiting, and these run *inside* the mutation
 * rather than at the HTTP edge, which buys two things: Convex clients calling
 * functions directly are covered as well as REST callers, and the token spend is
 * transactional — if the mutation later throws, the tokens come back.
 *
 * Limits are named here so a typo is a type error rather than a silently
 * separate bucket.
 */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  /**
   * General writes. A token bucket rather than a fixed window so a client that
   * has been idle can burst (`capacity`) instead of being clipped at an
   * arbitrary window boundary.
   */
  writes: { kind: "token bucket", rate: 120, period: MINUTE, capacity: 40 },

  /**
   * Uploads are metered separately and far more tightly: each one costs storage
   * and bandwidth, not just a row, so it shouldn't share a budget with cheap
   * field edits.
   */
  uploads: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 5 },

  /**
   * LLM calls — the tightest budget, because these are the only requests that
   * cost real money per call and are metered by the provider too.
   */
  ai: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 3 },
});

/**
 * Spend one token or throw `RATE_LIMITED`.
 *
 * The non-throwing form is used deliberately: the component's own `throws: true`
 * raises a `ConvexError` with its own payload shape, which `rest.ts` wouldn't
 * recognise and would report as a 500. Re-throwing as an app error keeps the
 * mapping to 429 (and the `Retry-After` header) in one place.
 */
async function consume(ctx: MutationCtx, name: "writes" | "uploads" | "ai", key: string): Promise<void> {
  const { ok, retryAfter } = await rateLimiter.limit(ctx, name, { key });
  if (!ok) {
    const seconds = Math.ceil((retryAfter ?? 0) / 1000);
    throw rateLimited(`Rate limit exceeded for ${name}. Retry in ${seconds}s.`, retryAfter ?? 0);
  }
}

/** Per-caller write budget. Keyed by the user, so one tenant can't starve another. */
export const limitWrites = (ctx: MutationCtx, ownerId: string) => consume(ctx, "writes", ownerId);

/** Per-caller upload budget. */
export const limitUploads = (ctx: MutationCtx, ownerId: string) => consume(ctx, "uploads", ownerId);

/**
 * Per-caller LLM budget.
 *
 * Actions can't spend tokens themselves — the limiter needs a `MutationCtx` to
 * stay transactional — so the agent reserves through a small internal mutation
 * (`features/assistant/messages.reserveAiBudget`) before it calls the model.
 */
export const limitAi = (ctx: MutationCtx, ownerId: string) => consume(ctx, "ai", ownerId);
