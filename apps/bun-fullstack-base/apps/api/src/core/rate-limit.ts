import type { Context, MiddlewareHandler } from "hono";
import { rateLimiter, type Store } from "hono-rate-limiter";

/** Requests allowed per client in each window, which requests don't count, and where the counts live. */
export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  skip?: (c: Context) => boolean;
  store?: Store;
}

/** The Bun server, which server.ts passes as the API's env. */
interface BunServerEnv {
  requestIP?: (req: Request) => { address: string } | null;
}

/**
 * Fails at start when `TRUST_PROXY` is set to anything but `true` or `false`: a typo would otherwise turn it off
 * silently, and behind a proxy every client would share one limit.
 */
function checkTrustProxy() {
  const value = process.env.TRUST_PROXY;
  if (value && value !== "true" && value !== "false") {
    throw new Error(`TRUST_PROXY must be "true" or "false", got "${value}"`);
  }
}

/**
 * The API's own limit, from `RATE_LIMIT`: requests a minute per client, 300 when unset, 0 for none (as when
 * benchmarking, where every request comes from one client). Anything else fails at start.
 */
export function apiRateLimit(): number {
  const value = process.env.RATE_LIMIT || "300";
  if (!/^\d+$/.test(value)) throw new Error(`RATE_LIMIT must be a whole number of requests a minute, got "${value}"`);
  return Number(value);
}

/**
 * A rate limit per client IP: past it, `429 { error }` with `Retry-After`. Each call keeps its own counts, in memory;
 * with several instances, pass a shared `store` (hono-rate-limiter's `RedisStore`).
 */
export function rateLimit({ limit, windowMs, skip, store }: RateLimitOptions): MiddlewareHandler {
  checkTrustProxy();
  return rateLimiter({
    limit,
    windowMs,
    skip,
    store,
    keyGenerator: clientIp,
    message: { error: "Too many requests, please try again later" },
  });
}

/**
 * Whether the client's IP is the one a proxy put in X-Forwarded-For (`TRUST_PROXY=true`, the image's default), or the
 * connection's. server.ts prints which at start, so a wrong one is visible instead of guessed at: trusted with no
 * proxy, every request looks like a new client, and limits stop counting; untrusted behind a proxy, every request
 * looks like the proxy, and one client's traffic uses up everyone's.
 */
export function trustProxy(): boolean {
  checkTrustProxy();
  return process.env.TRUST_PROXY === "true";
}

/**
 * The client's IP. Behind a proxy (`TRUST_PROXY=true`), the last `X-Forwarded-For` address, the one the proxy added;
 * otherwise the connection's. "unknown" without either, as in tests.
 */
export function clientIp(c: Context): string {
  const forwarded = trustProxy() && c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (forwarded) return forwarded;
  const server = c.env as BunServerEnv | undefined;
  return server?.requestIP?.(c.req.raw)?.address ?? "unknown";
}
