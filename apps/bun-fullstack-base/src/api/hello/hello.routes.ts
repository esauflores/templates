import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";

import { json, validate } from "@/api/core/router.ts";

import { greet } from "./hello.service.ts";

/** The name to greet, in the path: 1 to 50 characters. */
export const HelloParamsSchema = z.object({ name: z.string().min(1).max(50).meta({ example: "Ada" }) });

/** A greeting, named `Hello` in the OpenAPI document. */
export const HelloSchema = z.object({ message: z.string().meta({ example: "Hello, Ada!" }) }).meta({ ref: "Hello" });

/** GET /hello/{name}: a greeting, the name 1 to 50 characters (400 { error } otherwise). */
const hello = describeRoute({
  tags: ["hello"],
  summary: "Greet someone",
  responses: { 200: json(HelloSchema, "The greeting") },
});

/** A thin handler: the validated name to the service, its answer with an explicit status. */
export const helloRoutes = new Hono().get("/hello/:name", hello, validate("param", HelloParamsSchema), (c) => {
  const { name } = c.req.valid("param");
  return c.json(greet(name), 200);
});
