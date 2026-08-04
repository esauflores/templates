// External
import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { LRUCache } from "lru-cache";

// App
import type { Bindings } from "@/env";

// Database
import { user } from "@/db/schema";

// Infrastructure
import { auth } from "@/infrastructure/auth";
import { db } from "@/infrastructure/db";

// Cache
const verifiedCache = new LRUCache<string, boolean>({
  max: 10_000,
  ttl: 60_000,
});

export const requireVerifiedApiKey: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
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

  await next();
};

export const clearVerifiedCache = () => verifiedCache.clear();
