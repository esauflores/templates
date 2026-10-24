---
name: api-module
description: Add a feature module to the Hono API in src/api/<module>/ (routes with their schemas, service, tables, tests) and mount it, so it is validated by Zod, listed in /api/openapi.json and callable from the web app's typed client. Use when adding a new resource or feature to the API, e.g. "add a books API" or "add endpoints for invoices".
compatibility: Bun 1.4+. Run commands from the repo root.
---

# Add an API module

The rules are in `src/api/README.md`; `src/api/notes/` is the example to copy. Replace `books`/`Book` with the
module's name. Paths in routes are written without `/api`: the app's base path adds it.

## Steps

1. **Tables**, when the module stores data, in `src/api/books/books.tables.ts`. Then `bun run db:generate` writes the
   migration into `src/api/core/migrations/` (commit it), which the server applies at start. Never edit a migration
   that exists: change the table and generate another.

   ```ts
   import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

   export const books = sqliteTable("books", {
     id: integer().primaryKey({ autoIncrement: true }),
     title: text().notNull(),
   });
   ```

2. **Service**, `src/api/books/books.service.ts`: plain functions with doc comments, no Hono. Only this module's
   service queries its tables, through `db` from `@/api/core/db.ts`, and the queries are synchronous (no `async`). A
   domain failure throws an `HTTPException` with a 4xx status, which the API answers as `{ error: message }`. A query
   that runs on most requests is prepared once, right above its function, as in `src/api/notes/notes.service.ts`.

   ```ts
   import { eq } from "drizzle-orm";
   import { HTTPException } from "hono/http-exception";

   import { db } from "@/api/core/db.ts";

   import { books } from "./books.tables.ts";

   /** A book by its id; a 404 HTTPException when there's no such book. */
   export function findBook(id: number) {
     const [book] = db.select().from(books).where(eq(books.id, id)).all();
     if (!book) throw new HTTPException(404, { message: "No such book" });
     return book;
   }
   ```

3. **Routes**, `src/api/books/books.routes.ts`: the Zod schemas, each above the route that first uses it, then one
   `new Hono()` router with the routes chained. For each route:
   - a `describeRoute` declaring every answer, with `json(schema, description)` and `error(description)`: the OpenAPI
     document can't read answers from the handler. `tags` groups the module in Swagger UI (`/api/docs`);
   - a `validate(target, schema)` per input, which checks it (`400 { error }`) and documents it;
   - a thin handler: destructure `c.req.valid(…)`, call the service, `c.json(result, status)`.

   `.meta({ ref: "Book" })` names a schema in the document, `.meta({ example })` gives an example. Export the schemas,
   so the routes test can check their rules.

   ```ts
   import { Hono } from "hono";
   import { describeRoute } from "hono-openapi";
   import { z } from "zod";

   import { error, json, validate } from "@/api/core/router.ts";

   import { findBook } from "./books.service.ts";

   /** A book as the API answers it, named `Book` in the OpenAPI document. */
   export const BookSchema = z
     .object({ id: z.number().int().meta({ example: 1 }), title: z.string().meta({ example: "Dune" }) })
     .meta({ ref: "Book" });

   /** A book's id, in the path: a positive whole number. */
   export const BookIdSchema = z.object({ id: z.coerce.number().int().positive().meta({ example: 1 }) });

   /** GET /books/{id}: a book, 404 when there's no such book. */
   const getBook = describeRoute({
     tags: ["books"],
     summary: "Get a book",
     responses: { 200: json(BookSchema, "The book"), 404: error("No such book") },
   });

   export const booksRoutes = new Hono().get("/books/:id", getBook, validate("param", BookIdSchema), (c) => {
     const { id } = c.req.valid("param");
     return c.json(findBook(id), 200);
   });
   ```

   More routes: the `api-endpoint` skill.

4. **Mount** it in `src/api/app.ts` with `app.route("/", booksRoutes)`, and give the web app its client in
   `src/web/lib/api.ts`: `books: hc<typeof booksRoutes>("/api").books` in `api`, with `import type { booksRoutes }`.

5. **Tests**, next to the code: `books.service.test.ts` calls the service directly; `books.routes.test.ts` checks the
   schemas' rules (`.safeParse` on good and bad input) and the routes through `createApp().request("/api/books/1")`:
   the success, each declared error, and a 400. With tables, copy `src/api/notes/notes.tables.test.ts` to
   `books.tables.test.ts`. Each test file has a fresh in-memory database, so create the rows a test reads.

## Verify

```sh
bun run check:fix && bun run check
bun run test
```

The type-check doesn't compare a handler's answers with its `describeRoute`: check they match. The module then shows
in Swagger UI at `/api/docs` (`bun run dev`). To call it from the web app, use the `web-api-call` skill.
