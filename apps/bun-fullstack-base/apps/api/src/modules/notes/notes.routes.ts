import { createRoute } from "@hono/zod-openapi";

import { createRouter, ErrorSchema } from "@api/core/openapi.ts";

import { NewNoteSchema, NoteParamsSchema, NoteSchema, NotesPageSchema, NotesQuerySchema } from "./notes.schemas.ts";
import { addNote, listNotes, updateNote } from "./notes.service.ts";

const list = createRoute({
  method: "get",
  path: "/notes",
  summary: "List the notes, a page at a time",
  request: { query: NotesQuerySchema },
  responses: {
    200: { content: { "application/json": { schema: NotesPageSchema } }, description: "A page, newest first" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "The limit or cursor is invalid" },
  },
});

const add = createRoute({
  method: "post",
  path: "/notes",
  summary: "Add a note",
  request: { body: { content: { "application/json": { schema: NewNoteSchema } }, required: true } },
  responses: {
    201: { content: { "application/json": { schema: NoteSchema } }, description: "The note, as saved" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "The text is invalid" },
  },
});

const update = createRoute({
  method: "patch",
  path: "/notes/{id}",
  summary: "Change a note's text",
  request: {
    params: NoteParamsSchema,
    body: { content: { "application/json": { schema: NewNoteSchema } }, required: true },
  },
  responses: {
    200: { content: { "application/json": { schema: NoteSchema } }, description: "The note, as saved" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "The id or text is invalid" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "No such note" },
  },
});

export const notesRoutes = createRouter()
  .openapi(list, async (c) => c.json(await listNotes(c.req.valid("query")), 200))
  .openapi(add, async (c) => c.json(await addNote(c.req.valid("json").text), 201))
  .openapi(update, async (c) => c.json(await updateNote(c.req.valid("param").id, c.req.valid("json").text), 200));
