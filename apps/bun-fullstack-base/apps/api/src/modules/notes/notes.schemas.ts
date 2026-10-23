import { z } from "@hono/zod-openapi";

export const NoteSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    text: z.string().openapi({ example: "Buy milk" }),
    createdAt: z.string().openapi({ example: "2026-10-22T09:30:00.000Z" }),
  })
  .openapi("Note");

export const NotesPageSchema = z
  .object({
    notes: z.array(NoteSchema),
    next: z.number().int().nullable().openapi({ description: "`before` for the next page, null on the last" }),
  })
  .openapi("NotesPage");

export const NotesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ param: { name: "limit", in: "query" }, example: 20 }),
  before: z.coerce
    .number()
    .int()
    .optional()
    .openapi({ param: { name: "before", in: "query" }, description: "A page's `next`", example: 21 }),
});

export const NoteParamsSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: "id", in: "path" }, example: 1 }),
});

export const NewNoteSchema = z
  .object({ text: z.string().trim().min(1).max(500).openapi({ example: "Buy milk" }) })
  .openapi("NewNote");
