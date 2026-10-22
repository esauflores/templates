import { z } from "@hono/zod-openapi";

export const HelloParamsSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .openapi({ param: { name: "name", in: "path" }, example: "Ada" }),
});

export const HelloSchema = z.object({ message: z.string().openapi({ example: "Hello, Ada!" }) }).openapi("Hello");
