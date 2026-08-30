// External
import { serve } from "@hono/node-server";
import { config } from "dotenv";

config({ path: ".env" });

// App
import { bindings } from "@/env";
import app from "@/index";

const env = bindings();

serve({
  fetch: (req) => app.fetch(req, env),
  port: Number(env.PORT),
});

console.log(`api http://127.0.0.1:${env.PORT}`);
