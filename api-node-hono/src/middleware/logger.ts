// External
import type { MiddlewareHandler } from "hono";

// App
import type { AppEnv } from "@/lib/app";

/**
 * One line per request: `GET /api/v1/widgets 200 12ms req_abc`. Honours
 * `LOG_LEVEL` (`silent` disables it; tests set that in `.env.test`). Swap
 * `console.log` for a structured logger here if you need JSON logs.
 */
export const requestLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const start = Date.now();
  await next();
  if (c.env.LOG_LEVEL === "silent") return;
  console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${Date.now() - start}ms ${c.get("requestId")}`);
};
