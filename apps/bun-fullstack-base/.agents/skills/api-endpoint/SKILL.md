---
name: api-endpoint
description: Add an endpoint to an existing API module in src/api/<module>/, with a JSON body, query string or path params validated by Zod, declared responses, and tests. Use when an existing module needs another route, e.g. "add POST /api/books" or "let /api/books filter by title".
compatibility: Bun 1.4+. Run commands from the repo root.
---

# Add an endpoint to an API module

For a new module, use the `api-module` skill instead; the rules are in `src/api/README.md`.

## Steps

1. **Schemas** in `<module>.routes.ts`, exported, above the route that first uses them. Put the limits in the schema
   (`.min`, `.max`, `.email()`, …), not in the handler. Query and path values arrive as strings: use
   `z.coerce.number()` for numbers.

   ```ts
   /** The body that adds a book: its title, 1 to 200 characters. */
   export const NewBookSchema = z.object({ title: z.string().min(1).max(200) }).meta({ ref: "NewBook" });

   /** The query that filters the list: `q`, part of a title. */
   export const BookListQuerySchema = z.object({ q: z.string().optional().meta({ example: "dune" }) });
   ```

2. **Service** function in `<module>.service.ts`, with a doc comment: plain values in and out, an `HTTPException`
   (4xx) for a domain failure.

3. **Route**, chained onto the module's router (a separate `booksRoutes.post(…)` statement works but is missing from
   the web app's client types). A `describeRoute` declares every answer, including each error the service throws;
   `validate` checks and documents each input, the 400 included:

   | Input       | Middleware                               | Path         | Read with              |
   | ----------- | ---------------------------------------- | ------------ | ---------------------- |
   | Path params | `validate("param", BookIdSchema)`        | `/books/:id` | `c.req.valid("param")` |
   | Query       | `validate("query", BookListQuerySchema)` | `/books`     | `c.req.valid("query")` |
   | JSON body   | `validate("json", NewBookSchema)`        | `/books`     | `c.req.valid("json")`  |

   ```ts
   /** POST /books: adds a book, answering it with a 201. */
   const createBook = describeRoute({
     tags: ["books"],
     summary: "Add a book",
     responses: { 201: json(BookSchema, "The new book") },
   });

   export const booksRoutes = new Hono()
     .get("/books/:id", getBook, validate("param", BookIdSchema), (c) => {
       const { id } = c.req.valid("param");
       return c.json(findBook(id), 200);
     })
     .post("/books", createBook, validate("json", NewBookSchema), (c) => {
       const { title } = c.req.valid("json");
       return c.json(addBook(title), 201);
     });
   ```

   A route answering no body (a delete) declares `204: { description: "…" }` and answers `c.body(null, 204)`. One
   worth abusing (a login, a sign-up) gets a stricter limit before it in the chain:
   `.use("/books/import", rateLimit({ limit: 5, windowMs: 60_000 }))`, from `@/api/core/limits.ts`.

4. **Tests**: the service function in `<module>.service.test.ts`; in `<module>.routes.test.ts`, the new schemas'
   rules (`.safeParse` on good and bad input) and the route: the success, each declared error, and a 400. A JSON body
   needs its content type:

   ```ts
   const response = await createApp().request("/api/books", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ title: "Dune" }),
   });
   expect(response.status).toBe(201);
   ```

## Verify

```sh
bun run check:fix && bun run check
bun run test
```

The type-check doesn't compare a handler's answers with its `describeRoute`: when an answer changes, change its
declaration too. To call the endpoint from the web app, use the `web-api-call` skill.
