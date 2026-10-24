import { createApp } from "@/api/app.ts";
import { config } from "@/api/core/config.ts";
import index from "@/web/index.html";

import { pageRoutes } from "./static.ts";

/**
 * One process: the API (src/api) and the web app (src/web) on one port, in development and in production. Bun loads
 * the .env at the repo root.
 *
 * /api and everything under it goes to the API ("/api/*" alone doesn't match "/api"), everything else to the web
 * app, which answers any other path with its index.html, so client-side routes load too.
 * - `bun run dev`: Bun bundles the page (TSX, and the stylesheet the dev script compiles), rebundles on change and
 *   hot-reloads it (React Fast Refresh); --hot reloads the API. It listens on 127.0.0.1 only, so the dev server (hot
 *   reload, browser console) isn't reachable from the network.
 * - `bun run build`, then `bun run start`: scripts/build.ts bundles this file, the API and the page into dist/ ahead
 *   of time, with NODE_ENV inlined as production; the page's files are read once at start and served from memory
 *   (static.ts).
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
 * Docker's stop (SIGTERM) and Ctrl-C (SIGINT): stop taking connections, let requests in flight finish, then exit.
 * A request that never finishes can't hold the container past the grace period (Docker's own is 10 s).
 * Registered once, as `bun --hot` reruns this file on every change but keeps the process.
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
