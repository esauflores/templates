import type { MutationCtx, QueryCtx } from "@/_generated/server";
import { unauthenticated } from "@/infrastructure/lib/errors";
import { limitUploads, limitWrites } from "@/infrastructure/lib/limits";

/**
 * The verified caller's stable id (the JWT `sub` claim), or throw. Works in
 * queries, mutations, actions, and HTTP actions — `ctx.auth` is on all of them,
 * and the identity propagates through `ctx.runQuery` / `ctx.runMutation`.
 *
 * `subject` is the right key to scope data by: it's asserted by the identity
 * provider and cannot be spoofed by the client, unlike an email argument.
 *
 * The trusted issuer is configured in `convex/auth.config.ts` (Clerk).
 */
export async function requireUserId(ctx: { auth: QueryCtx["auth"] }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw unauthenticated("Authentication required");
  return identity.subject;
}

/**
 * The mutation-side entry point: identity **plus** a write rate-limit token.
 *
 * Reads use `requireUserId`, writes use this. Splitting them by name means the
 * budget can't be forgotten on a new mutation the way a separate `await
 * limitWrites(...)` line could be, and metering reads separately (which are
 * cheap and cacheable) stays a deliberate choice rather than an accident.
 */
export async function requireWriter(ctx: MutationCtx): Promise<string> {
  const ownerId = await requireUserId(ctx);
  await limitWrites(ctx, ownerId);
  return ownerId;
}

/**
 * As `requireWriter`, against the tighter upload budget. Used where a call
 * commits storage rather than just a row — see `infrastructure/storage/files.ts`.
 */
export async function requireUploader(ctx: MutationCtx): Promise<string> {
  const ownerId = await requireUserId(ctx);
  await limitUploads(ctx, ownerId);
  return ownerId;
}
