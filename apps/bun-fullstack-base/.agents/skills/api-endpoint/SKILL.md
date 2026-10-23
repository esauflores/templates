---
name: api-endpoint
description: Add an endpoint to an existing API module in apps/api/src/modules/<module>/, with a JSON body, query string or path params validated by Zod, declared responses, and tests. Use when an existing module needs another route, e.g. "add POST /api/books" or "let /api/books filter by title".
compatibility: Bun 1.4+. Run commands from the repo root.
---

# Add an endpoint to an API module

For a new module, use the `api-module` skill instead. Rules and request flow are in `apps/api/README.md`.

## Steps

1. **Schemas** in `<module>.schemas.ts` for what the endpoint takes and returns. Import `z` from
   `@hono/zod-openapi`. Put the limits in the schema (`.min`, `.max`, `.email()`, …): invalid input then answers
   `400 { error }` before the handler runs, with no checks in the handler.

   ```ts
   export const NewBookSchema = z.object({ title: z.string().min(1).max(200) }).openapi("NewBook");

   export const BookListQuerySchema = z.object({
     q: z
       .string()
       .optional()
       .openapi({ param: { name: "q", in: "query" }, example: "dune" }),
   });
   ```

   Query and path values arrive as strings: use `z.coerce.number()` (or similar) for numbers.

2. **Service** function in `<module>.service.ts`: plain values in and out, `HTTPException` (4xx) for domain failures.

3. **Route** in `<module>.routes.ts`, declaring every response, including each error status the service can throw
   (with `ErrorSchema`) and `400` when there is input to validate:

   - **Path params:** `params: BookParamsSchema` in `request`, the path written `/books/{id}`; read with
     `c.req.valid("param")`.
   - **Query:** `query: BookListQuerySchema` in `request`; read with `c.req.valid("query")`.
   - **JSON body:** `body: { content: { "application/json": { schema: NewBookSchema } }, required: true }` in
     `request`; read with `c.req.valid("json")`.

   ```ts
   const createBook = createRoute({
     method: "post",
     path: "/books",
     request: { body: { content: { "application/json": { schema: NewBookSchema } }, required: true } },
     responses: {
       201: { content: { "application/json": { schema: BookSchema } }, description: "The new book" },
       400: { content: { "application/json": { schema: ErrorSchema } }, description: "The book is invalid" },
     },
   });
   ```

4. **Chain** it onto the module's existing router, so its type reaches `AppType`:

   ```ts
   export const booksRoutes = createRouter()
     .openapi(getBook, (c) => c.json(findBook(c.req.valid("param").id), 200))
     .openapi(createBook, (c) => c.json(addBook(c.req.valid("json").title), 201));
   ```

   Don't register it in a separate statement (`booksRoutes.openapi(…)` on its own line): it works at runtime but is
   missing from the web app's client types. Nothing changes in `app.ts`; the module is already mounted.

   An endpoint worth abusing (a login, a sign-up, one that sends email) also gets a stricter rate limit, in the
   chain before its route: `.use("/books/import", rateLimit({ limit: 5, windowMs: 60_000 }))`, with `rateLimit` from
   `@api/core/rate-limit.ts`. Added after the route, it never runs. See "Rate limits" in `apps/api/README.md`.

5. **Tests** in `apps/api/tests/modules/<module>/`: the success status and body, each declared error, and a 400 for
   invalid input. A JSON body needs its content type:

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

A type error on `c.json(…)` means the handler answers something the route doesn't declare: fix one of the two,
never cast. To call the endpoint from the web app, use the `web-api-call` skill.
