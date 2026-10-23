import type { MiddlewareHandler } from "hono";

/**
 * Logs each request once it's answered, one line: `GET /api/hello/world 200 3ms`. Paths in `skip` aren't logged
 * (/api/health, which uptime checks call every few seconds).
 * It replaces Hono's `logger()` in an `except()`, which writes two lines (`<--` on arrival, `-->` when answered) and
 * took twice the time: about a third of a simple request's time on one core.
 */
export function requestLogger({ skip = [] }: { skip?: string[] } = {}): MiddlewareHandler {
  return async (c, next) => {
    if (skip.includes(c.req.path)) return next();
    const start = performance.now();
    await next();
    console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${Math.round(performance.now() - start)}ms`);
  };
}
