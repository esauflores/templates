---
name: api-module
description: Add a feature module to the Hono API in apps/api/src/modules/ (schemas, tables, service, routes, tests) and mount it, so it is validated by Zod, listed in /api/openapi.json and callable from the web app's typed client. Use when adding a new resource or feature to the API, e.g. "add a books API" or "add endpoints for invoices".
compatibility: Bun 1.4+. Run commands from the repo root.
---

# Add an API module

Read `apps/api/README.md` first: it holds the module rules (thin routes, services without HTTP, modules talk through
services, `core/` never imports `modules/`), the request flow and the database. `apps/api/src/modules/hello/` is a
working example, `apps/api/src/modules/notes/` one with a table.

## Steps

Replace `books`/`Book` with the module's name. Paths in routes are written without `/api`: the app's base path adds it.

1. **Schemas**, `apps/api/src/modules/books/books.schemas.ts`. Import `z` from `@hono/zod-openapi`, not `zod`. Name
   response and body schemas with `.openapi("Name")` so they appear as components in the OpenAPI document. Path and
   query params need `.openapi({ param: { name, in } })`.

   ```ts
   import { z } from "@hono/zod-openapi";

   export const BookSchema = z
     .object({ id: z.number().int().openapi({ example: 1 }), title: z.string().openapi({ example: "Dune" }) })
     .openapi("Book");

   export const BookParamsSchema = z.object({
     id: z.coerce
       .number()
       .int()
       .openapi({ param: { name: "id", in: "path" }, example: 1 }),
   });
   ```

2. **Table**, when the module stores data, `apps/api/src/modules/books/books.table.ts`, with Drizzle's
   `drizzle-orm/sqlite-core`. Then `bun run db:generate` writes the migration into `apps/api/drizzle/` (commit it);
   the server applies it at start, and the tests on their in-memory database. Never edit a migration that exists:
   change the table and generate another.

   ```ts
   import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

   export const books = sqliteTable("books", {
     id: integer().primaryKey({ autoIncrement: true }),
     title: text().notNull(),
   });
   ```

3. **Service**, `apps/api/src/modules/books/books.service.ts`. Plain functions: no Hono `Context`, no `c`. Only
   this module's service queries its tables, through `db` from `@api/core/db.ts`. A domain failure throws
   `HTTPException` with a 4xx status; `core/errors.ts` turns it into `{ error: message }`. A query that runs on most
   requests is prepared once at the top of the service (`sql.placeholder`, `.prepare()`), as in
   `modules/notes/notes.service.ts`; values a column's `$defaultFn` would fill go in as placeholders too.

   ```ts
   import { eq } from "drizzle-orm";
   import { HTTPException } from "hono/http-exception";

   import { db } from "@api/core/db.ts";

   import { books } from "./books.table.ts";

   export async function findBook(id: number) {
     const [book] = await db.select().from(books).where(eq(books.id, id));
     if (!book) throw new HTTPException(404, { message: "No such book" });
     return book;
   }
   ```

4. **Routes**, `apps/api/src/modules/books/books.routes.ts`. One `createRoute` per endpoint, every possible response
   declared (errors with `ErrorSchema`), and one router from `createRouter()` with the routes chained. Never
   `new Hono()` or a bare `new OpenAPIHono()`: those skip the 400 validation answer, and plain Hono routers are left
   out of the document. Handlers stay one expression: read `c.req.valid(…)`, call the service, `c.json(result, status)`
   with an explicit status.

   ```ts
   import { createRoute } from "@hono/zod-openapi";

   import { createRouter, ErrorSchema } from "@api/core/openapi.ts";

   import { BookParamsSchema, BookSchema } from "./books.schemas.ts";
   import { findBook } from "./books.service.ts";

   const getBook = createRoute({
     method: "get",
     path: "/books/{id}",
     request: { params: BookParamsSchema },
     responses: {
       200: { content: { "application/json": { schema: BookSchema } }, description: "The book" },
       404: { content: { "application/json": { schema: ErrorSchema } }, description: "No such book" },
     },
   });

   export const booksRoutes = createRouter().openapi(getBook, async (c) =>
     c.json(await findBook(c.req.valid("param").id), 200),
   );
   ```

   More endpoints in the same module: see the `api-endpoint` skill.

5. **Mount** it in `apps/api/src/app.ts`: import `booksRoutes` and append `.route("/", booksRoutes)` to the chain that
   `createApp` returns. Keep that chain one expression ending in `return`: it is what gives `AppType` the routes, and
   a route mounted outside it works at runtime but is missing from the web app's client types.

6. **Tests**, `apps/api/tests/modules/books/books.test.ts`, importing from `vite-plus/test`. Test the service directly,
   and the routes through `createApp().request("/api/books/1")`: the success case, each declared error status, and a
   400 for invalid input. Each test file has a fresh in-memory database, so create the rows a test reads.

## Verify

```sh
bun run check:fix && bun run check   # format, lint, type-check
bun run test
```

`bun run check` fails when a handler's `c.json(…)` doesn't match a declared response (status and shape). Fix the
handler or declare the response; never cast around it. Then confirm the module is in the document:

```sh
bun -e '
  import { createApp } from "api";
  const doc = await (await createApp().request("/api/openapi.json")).json();
  console.log(Object.keys(doc.paths));
'
```

To call the module from the web app, use the `web-api-call` skill.
