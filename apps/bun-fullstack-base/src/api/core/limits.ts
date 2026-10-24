import type { Context, MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { bodyLimit as honoBodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";

import { config } from "@/api/core/config.ts";

/**
 * The client's IP: behind a trusted proxy (`TRUST_PROXY`), the last X-Forwarded-For address, the one the proxy added;
 * otherwise the connection's. "unknown" without either, as in tests.
 */
export function clientIp(c: Context, trustProxy: boolean): string {
  const forwarded = trustProxy && c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (forwarded) return forwarded;
  const server = c.env as { requestIP?: (req: Request) => { address: string } | null } | undefined;
  return server?.requestIP?.(c.req.raw)?.address ?? "unknown";
}

/**
 * At most `limit` requests per client IP in each window, then `429 { error }` with Retry-After. Counts in memory.
 * TRUST_PROXY is read once, here, not on every request.
 */
export function rateLimit(options: { limit: number; windowMs: number }): MiddlewareHandler {
  const { TRUST_PROXY } = config();
  return rateLimiter({
    ...options,
    keyGenerator: (c) => clientIp(c, TRUST_PROXY),
    message: { error: "Too many requests, please try again later" },
  });
}

/**
 * Bodies over `maxSize` bytes answer `413 { error }`, from Content-Length before anything reads them, or as soon as a
 * chunked one passes it. Hono's own bodyLimit answers plain text; this one throws, so onError answers `{ error }`.
 */
export const bodyLimit = (maxSize: number): MiddlewareHandler =>
  honoBodyLimit({
    maxSize,
    onError: () => {
      throw new HTTPException(413, { message: `The request body is over ${maxSize} bytes` });
    },
  });
