// External
import { z } from "@hono/zod-openapi";

export const positionSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]);

export const chunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  positions: z.array(positionSchema),
});

export const questionBody = z.object({
  question: z.string({ error: "question required" }).trim().min(1, "question required"),
  top_k: z.number().int().positive().optional(),
});
