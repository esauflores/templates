import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";

import { error, json, validate } from "@/api/core/router.ts";

import { addNote, deleteNote, listNotes, updateNote } from "./notes.service.ts";

/** A note as the API answers it, named `Note` in the OpenAPI document. */
export const NoteSchema = z
  .object({
    id: z.number().int().meta({ example: 1 }),
    text: z.string().meta({ example: "Buy milk" }),
    createdAt: z.string().meta({ example: "2026-10-22T09:30:00.000Z" }),
  })
  .meta({ ref: "Note" });

/** A page of notes and the cursor for the next, named `NotesPage`. */
export const NotesPageSchema = z
  .object({
    notes: z.array(NoteSchema),
    next: z.number().int().nullable().meta({ description: "`before` for the next page, null on the last" }),
  })
  .meta({ ref: "NotesPage" });

/** The query that picks a page: `limit`, 1 to 100 (20 by default), and `before`, a page's `next`. */
export const NotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).meta({ example: 20 }),
  before: z.coerce.number().int().optional().meta({ description: "A page's `next`", example: 21 }),
});

/** GET /notes: a page of notes, newest first, `?limit=` (20 by default) and `?before=` a page's `next`. */
const list = describeRoute({
  tags: ["notes"],
  summary: "List the notes, a page at a time",
  responses: { 200: json(NotesPageSchema, "A page, newest first") },
});

/** The body that adds or changes a note: its text, trimmed, 1 to 500 characters. */
export const NewNoteSchema = z
  .object({ text: z.string().trim().min(1).max(500).meta({ example: "Buy milk" }) })
  .meta({ ref: "NewNote" });

/** POST /notes: adds a note, its text trimmed, and answers it with a 201. */
const add = describeRoute({
  tags: ["notes"],
  summary: "Add a note",
  responses: { 201: json(NoteSchema, "The note, as saved") },
});

/** A note's id, in the path: a positive whole number. */
export const NoteIdSchema = z.object({ id: z.coerce.number().int().positive().meta({ example: 1 }) });

/** PATCH /notes/{id}: changes a note's text, 404 when there's no such note. */
const update = describeRoute({
  tags: ["notes"],
  summary: "Change a note's text",
  responses: { 200: json(NoteSchema, "The note, as saved"), 404: error("No such note") },
});

/** DELETE /notes/{id}: removes a note, answering 204 with no body; 404 when there's no such note. */
const remove = describeRoute({
  tags: ["notes"],
  summary: "Delete a note",
  responses: { 204: { description: "The note was deleted" }, 404: error("No such note") },
});

/**
 * The handlers stay thin: read the validated input, call the service, answer with an explicit status. `validate`
 * checks and documents the input (400 { error } when it's invalid). Chained, so the router's type carries every route,
 * for the web app's typed client.
 */
export const notesRoutes = new Hono()
  .get("/notes", list, validate("query", NotesQuerySchema), (c) => {
    const { limit, before } = c.req.valid("query");
    return c.json(listNotes({ limit, before }), 200);
  })
  .post("/notes", add, validate("json", NewNoteSchema), (c) => {
    const { text } = c.req.valid("json");
    return c.json(addNote(text), 201);
  })
  .patch("/notes/:id", update, validate("param", NoteIdSchema), validate("json", NewNoteSchema), (c) => {
    const { id } = c.req.valid("param");
    const { text } = c.req.valid("json");
    return c.json(updateNote(id, text), 200);
  })
  .delete("/notes/:id", remove, validate("param", NoteIdSchema), (c) => {
    const { id } = c.req.valid("param");
    deleteNote(id);
    return c.body(null, 204);
  });
