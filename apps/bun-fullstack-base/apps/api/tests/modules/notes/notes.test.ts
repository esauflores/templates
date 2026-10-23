import { describe, expect, it } from "vite-plus/test";

import { createApp } from "@api/app.ts";
import { addNote, listNotes } from "@api/modules/notes/notes.service.ts";

/** A POST /api/notes with a JSON body. */
const post = (body: unknown) =>
  createApp().request("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("notes", () => {
  it("saves a note and lists it first", async () => {
    const note = await addNote("First");
    await addNote("Second");

    expect(note).toEqual({ id: expect.any(Number), text: "First", createdAt: expect.any(String) });
    expect((await listNotes({ limit: 2 })).notes.map((n) => n.text)).toEqual(["Second", "First"]);
  });

  it("pages through every note once, newest first, and ends with no next", async () => {
    const added: number[] = [];
    for (let i = 0; i < 5; i++) added.push((await addNote(`Note ${i}`)).id);
    const seen: number[] = [];
    let before: number | undefined;
    do {
      const page = await listNotes({ limit: 2, before });
      seen.push(...page.notes.map((n) => n.id));
      before = page.next ?? undefined;
    } while (before !== undefined);

    expect(seen.filter((id) => added.includes(id))).toEqual([...added].reverse());
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("GET /api/notes", () => {
  it("answers a page and the cursor for the next", async () => {
    for (let i = 0; i < 3; i++) await addNote(`Note ${i}`);
    const response = await createApp().request("/api/notes?limit=2");
    const page = (await response.json()) as { notes: { id: number }[]; next: number | null };

    expect(response.status).toBe(200);
    expect(page.notes).toHaveLength(2);
    expect(page.next).toBe(page.notes[1]!.id);
  });

  it("rejects a limit over 100 with a 400", async () => {
    const response = await createApp().request("/api/notes?limit=101");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.stringContaining("<=100") });
  });
});

describe("POST /api/notes", () => {
  it("answers the saved note with a 201, trimmed, and GET lists it first", async () => {
    const response = await post({ text: "  Buy milk " });
    const note = (await response.json()) as { id: number; text: string };

    expect(response.status).toBe(201);
    expect(note.text).toBe("Buy milk");
    expect(await (await createApp().request("/api/notes?limit=1")).json()).toMatchObject({ notes: [note] });
  });

  it("rejects an empty text with a 400", async () => {
    const response = await post({ text: " " });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.stringContaining(">=1 characters") });
  });
});
