import { createApp } from "api";
import { desc, lt } from "drizzle-orm";
import { test, vi } from "vite-plus/test";

import { db } from "@api/core/db.ts";
import { addNote, listNotes } from "@api/modules/notes/notes.service.ts";
import { notes } from "@api/modules/notes/notes.table.ts";

/**
 * In-process benchmarks of the API, through Vitest's `bench` (tinybench): no server and no network, so the numbers
 * only compare the lines of one run with each other. The HTTP numbers are http.ts's.
 * Each run starts on a fresh in-memory database of 50 notes, with the request log muted and no rate limit.
 */
vi.stubEnv("RATE_LIMIT", "0");
vi.spyOn(console, "log").mockImplementation(() => {});
for (let i = 1; i <= 50; i++) addNote(`Note number ${i}, a line of text`);

const app = createApp();

/** A request with a JSON body, read to the end like a client would. */
const send = async (method: string, path: string, body?: unknown) => {
  const init = body ? { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {};
  await (await app.request(path, init)).text();
};

test("API routes", async ({ bench }) => {
  await bench.compare(
    bench("GET /api/hello/{name}", () => send("GET", "/api/hello/bench")),
    bench("GET /api/notes", () => send("GET", "/api/notes")),
    bench("POST /api/notes", () => send("POST", "/api/notes", { text: "A note from the benchmark" })),
    bench("PATCH /api/notes/{id}", () => send("PATCH", "/api/notes/25", { text: "Changed" })),
  );
});

test("a page of notes: prepared once, or built each time", async ({ bench }) => {
  await bench.compare(
    bench("prepared (listNotes)", () => listNotes({ limit: 20 })),
    bench("built each time", () =>
      db.select().from(notes).where(lt(notes.id, Number.MAX_SAFE_INTEGER)).orderBy(desc(notes.id)).limit(21)),
  );
});

test("adding a note: prepared once, or built each time", async ({ bench }) => {
  await bench.compare(
    bench("prepared (addNote)", () => addNote("A note")),
    bench("built each time", () => db.insert(notes).values({ text: "A note" }).returning()),
  );
});
