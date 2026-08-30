// External
import { serve } from "@hono/node-server";
import { config } from "dotenv";

config({ path: ".env" });

// App
import { bindings } from "@/env";
import { chunkCount, loadIndex } from "@/features/rag/store";
import app from "@/index";

const env = bindings();
await loadIndex(env);

serve({
  fetch: (req) => app.fetch(req, env),
  port: Number(env.PORT),
});

console.log(`ai http://127.0.0.1:${env.PORT}  chunks=${chunkCount()}`);
