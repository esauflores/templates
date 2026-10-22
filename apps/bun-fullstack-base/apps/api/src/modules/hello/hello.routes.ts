import { createRoute } from "@hono/zod-openapi";

import { createRouter, ErrorSchema } from "@api/core/openapi.ts";

import { HelloParamsSchema, HelloSchema } from "./hello.schemas.ts";
import { greet } from "./hello.service.ts";

const hello = createRoute({
  method: "get",
  path: "/hello/{name}",
  summary: "Greet someone",
  request: { params: HelloParamsSchema },
  responses: {
    200: { content: { "application/json": { schema: HelloSchema } }, description: "The greeting" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "The name is invalid" },
  },
});

export const helloRoutes = createRouter().openapi(hello, (c) => c.json(greet(c.req.valid("param").name), 200));
