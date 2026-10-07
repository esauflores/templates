import { Hono } from "hono";

import { infer } from "@/model.ts";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok", model_loaded: true }));
app.get("/api/hello/:name", (c) => c.json({ message: `Hello, ${c.req.param("name")}!` }));
app.post("/infer", async (c) => {
  const { inputs } = await c.req.json<{ inputs: number[][] }>();
  return c.json({ scores: await infer(inputs) });
});

export default app;
