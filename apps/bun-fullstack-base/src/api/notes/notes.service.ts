import { desc, eq, lt, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { db } from "@/api/core/db.ts";

import { notes } from "./notes.tables.ts";

/** A page's query, prepared once, with placeholders for the values. */
const pageQuery = db
  .select()
  .from(notes)
  .where(lt(notes.id, sql.placeholder("before")))
  .orderBy(desc(notes.id))
  .limit(sql.placeholder("limit"))
  .prepare();

/**
 * Up to `limit` notes older than `before` (a note's id), newest first. `next` is the `before` for the next page, or
 * null on the last.
 */
export function listNotes({ limit, before }: { limit: number; before?: number }) {
  const rows = pageQuery.all({ before: before ?? Number.MAX_SAFE_INTEGER, limit: limit + 1 });
  const page = rows.slice(0, limit);
  return { notes: page, next: rows.length > limit ? page.at(-1)!.id : null };
}

/** Adding a note, prepared once. createdAt is a placeholder, so each note gets its own time. */
const insertQuery = db
  .insert(notes)
  .values({ text: sql.placeholder("text"), createdAt: sql.placeholder("createdAt") })
  .returning()
  .prepare();

/** Adds a note, timestamped now, and returns it as saved. */
export function addNote(text: string) {
  return insertQuery.all({ text, createdAt: new Date().toISOString() })[0]!;
}

/** Changing a note's text, prepared once. */
const updateQuery = db
  .update(notes)
  .set({ text: sql.placeholder("text") })
  .where(eq(notes.id, sql.placeholder("id")))
  .returning()
  .prepare();

/** Changes a note's text and returns it as saved; a 404 HTTPException when there's no such note. */
export function updateNote(id: number, text: string) {
  const [note] = updateQuery.all({ id, text });
  if (!note) throw new HTTPException(404, { message: "No such note" });
  return note;
}

/** Removing a note, prepared once. */
const deleteQuery = db
  .delete(notes)
  .where(eq(notes.id, sql.placeholder("id")))
  .returning({ id: notes.id })
  .prepare();

/** Deletes a note; a 404 HTTPException when there's no such note. */
export function deleteNote(id: number) {
  const [note] = deleteQuery.all({ id });
  if (!note) throw new HTTPException(404, { message: "No such note" });
}
