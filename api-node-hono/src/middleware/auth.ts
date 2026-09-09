// External
import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { LRUCache } from "lru-cache";

// App
import type { AppEnv } from "@/lib/app";

// Database
import { user } from "@/db/schema";

// Infrastructure
import { auth } from "@/infrastructure/auth";
import { clerk } from "@/infrastructure/auth/clerk";
import { db } from "@/infrastructure/db";

// Cache
const verifiedCache = new LRUCache<string, boolean>({
  max: 10_000,
  ttl: 60_000,
});

/**
 * Better Auth path: `x-api-key` header → the key's owning user → require a
 * verified email → set `userId`. The verification flag is cached for 60s.
 */
export const requireVerifiedApiKey: MiddlewareHandler<AppEnv> = async (c, next) => {
  const key = c.req.header("x-api-key");

  if (!key) throw new HTTPException(401, { message: "Missing API Key" });

  const result = await auth(c.env).api.verifyApiKey({ body: { key } });

  const referenceId = result.key?.referenceId;

  if (!result.valid || !referenceId) throw new HTTPException(401, { message: "Invalid API Key" });

  let verified = verifiedCache.get(referenceId);

  if (verified === undefined) {
    const [userRecord] = await db(c.env)
      .select({ emailVerified: user.emailVerified })
      .from(user)
      .where(eq(user.id, referenceId))
      .limit(1);

    verified = !!userRecord?.emailVerified;
    verifiedCache.set(referenceId, verified);
  }

  if (!verified) throw new HTTPException(403, { message: "Email Not Verified" });

  c.set("userId", referenceId);

  await next();
};

/**
 * Clerk path: `Authorization: Bearer <token>` — a Clerk session JWT or a Clerk
 * API key. `userId` is the token's user (falling back to its subject for an
 * org-owned API key).
 */
export const requireClerkAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const state = await clerk(c.env).authenticateRequest(c.req.raw, {
    acceptsToken: ["session_token", "api_key"],
  });

  if (!state.isAuthenticated) throw new HTTPException(401, { message: "Unauthorized" });

  const claims = state.toAuth() as { userId?: string | null; subject?: string | null };
  const userId = claims.userId ?? claims.subject ?? null;
  if (!userId) throw new HTTPException(401, { message: "Unauthorized" });

  c.set("userId", userId);

  await next();
};

/** Dispatches to the configured provider's gate. */
export const requireAuth: MiddlewareHandler<AppEnv> = (c, next) =>
  (c.env.AUTH_PROVIDER === "clerk" ? requireClerkAuth : requireVerifiedApiKey)(c, next);

export const clearVerifiedCache = () => verifiedCache.clear();
