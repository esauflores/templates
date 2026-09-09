// External
import { z } from "@hono/zod-openapi";

/**
 * Shared list query params: `?limit=&offset=&order=`. A feature adds its own
 * `sort` enum on top, e.g. `listQuery.extend({ sort: z.enum([...]).default(...) })`.
 */
export const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  offset: z.coerce.number().int().min(0).default(0).openapi({ example: 0 }),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ListQuery = z.infer<typeof listQuery>;

/** OpenAPI schema for a page of `item`s — mirrors what `page()` returns. */
export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  });

export const page = <T>(items: T[], total: number, q: { limit: number; offset: number }) => ({
  items,
  total,
  limit: q.limit,
  offset: q.offset,
});
