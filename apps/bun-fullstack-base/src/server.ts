import { createApp } from "@/api/app.ts";
import { config } from "@/api/core/config.ts";
import index from "@/web/index.html";

import { pageRoutes } from "./static.ts";

/**
 * One process serves the API (/api) and the web app (everything else) on one port. Dev listens on 127.0.0.1 only;
 * production is bundled ahead of time into dist/ (scripts/build.ts).
 */

const { PORT, TRUST_PROXY } = config();

const app = createApp();

const server = Bun.serve({
  port: PORT,
  hostname: process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  routes: {
    "/api": app.fetch,
    "/api/*": app.fetch,
    ...(await pageRoutes(index)),
  },
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
});

/**
 * SIGTERM (Docker stop) and SIGINT (Ctrl-C): finish in-flight requests, then exit within the grace period.
 * Registered once, since `bun --hot` reruns this file on each change.
 */
const SHUTDOWN_GRACE_MS = 5_000;
const shutdown = () => {
  setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref();
  return server.stop().then(() => process.exit(0));
};

const processState = globalThis as { started?: boolean };
if (!processState.started) {
  processState.started = true;
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  console.log(`Listening on ${server.url.href}`);
  const per = TRUST_PROXY ? "the X-Forwarded-For header (TRUST_PROXY)" : "the connection's address";
  console.log(`Client IP: ${per}`);
}
