import { describe, expect, it } from "vite-plus/test";

import { addNote, deleteNote, listNotes, updateNote } from "./notes.service.ts";

describe("listNotes and addNote", () => {
  it("saves a note and lists it first", async () => {
    const note = addNote("First");
    addNote("Second");

    expect(note).toEqual({ id: expect.any(Number), text: "First", createdAt: expect.any(String) });
    expect(listNotes({ limit: 2 }).notes.map((n) => n.text)).toEqual(["Second", "First"]);
  });

  it("pages through every note once, newest first, and ends with no next", async () => {
    const added: number[] = [];
    for (let i = 0; i < 5; i++) added.push(addNote(`Note ${i}`).id);
    const seen: number[] = [];
    let before: number | undefined;
    do {
      const page = listNotes({ limit: 2, before });
      seen.push(...page.notes.map((n) => n.id));
      before = page.next ?? undefined;
    } while (before !== undefined);

    expect(seen.filter((id) => added.includes(id))).toEqual([...added].reverse());
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("updateNote", () => {
  it("changes the text, keeping the id and time", () => {
    const note = addNote("Draft");

    expect(updateNote(note.id, "Final")).toEqual({ ...note, text: "Final" });
  });

  it("throws a 404 for a note that doesn't exist", () => {
    expect(() => updateNote(999_999, "Final")).toThrow("No such note");
  });
});

describe("deleteNote", () => {
  it("removes the note", () => {
    const note = addNote("Done");
    deleteNote(note.id);

    expect(listNotes({ limit: 100 }).notes.map((n) => n.id)).not.toContain(note.id);
  });

  it("throws a 404 for a note that doesn't exist", () => {
    expect(() => deleteNote(999_999)).toThrow("No such note");
  });
});
