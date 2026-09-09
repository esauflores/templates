// External
import { serve } from "@hono/node-server";
import { config } from "dotenv";

config({ path: ".env" });

// App
import { bindings } from "@/env";
import app from "@/index";

const env = bindings();

const server = serve({
  fetch: (req) => app.fetch(req, env),
  port: Number(env.PORT),
});

console.log(`api http://127.0.0.1:${env.PORT}`);

// Graceful shutdown: stop accepting connections, let in-flight requests finish,
// then exit. The hard timeout stops a stuck request from blocking the deploy.
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
