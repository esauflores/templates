import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/api/hello/:name", (c) => c.json({ message: `Hello, ${c.req.param("name")}!` }));

export default app;
