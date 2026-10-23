import { desc, lt, sql } from "drizzle-orm";

import { db } from "@api/core/db.ts";

import { notes } from "./notes.table.ts";

/**
 * A page's query, prepared once: SQLite parses and plans it here, not on every request, which more than doubles the
 * pages a second. It reads one note past the limit, to tell whether there's a next page.
 */
const pageQuery = db
  .select()
  .from(notes)
  .where(lt(notes.id, sql.placeholder("before")))
  .orderBy(desc(notes.id))
  .limit(sql.placeholder("limit"))
  .prepare();

/**
 * A page of notes, newest first: the `limit` notes older than `before` (a note's id), or the newest. `next` is the
 * `before` for the page after, null on the last. Paging by id, not by offset, keeps pages steady as notes are added.
 */
export async function listNotes({ limit, before }: { limit: number; before?: number }) {
  const rows = await pageQuery.all({ before: before ?? Number.MAX_SAFE_INTEGER, limit: limit + 1 });
  const page = rows.slice(0, limit);
  return { notes: page, next: rows.length > limit ? page.at(-1)!.id : null };
}

/**
 * Adding a note, prepared once like the page's query: twice the notes a second. createdAt is a placeholder too, as a
 * default ($defaultFn) would be worked out once, here, and every note would get the same time.
 */
const insertQuery = db
  .insert(notes)
  .values({ text: sql.placeholder("text"), createdAt: sql.placeholder("createdAt") })
  .returning()
  .prepare();

export async function addNote(text: string) {
  const [note] = await insertQuery.all({ text, createdAt: new Date().toISOString() });
  return note!;
}
