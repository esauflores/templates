# api

The Hono API, everything under `/api`, served by `server/` on the web app's origin (so no CORS).
It's organized by feature: each **module** owns its routes, schemas and logic, and `app.ts` only wires modules
together. `modules/hello/` is the working example to copy.

| Endpoint                | What it answers                                                          |
| ----------------------- | ------------------------------------------------------------------------ |
| `GET /api/health`       | `{ ok: true }`, for uptime checks                                        |
| `GET /api/openapi.json` | The OpenAPI 3.1 document, built from the modules (`/health` isn't in it) |
| `GET /api/hello/{name}` | `{ message }`: the example module                                        |

## Layout

```
src/
├── app.ts           createApp(): the /api base path, core middleware, the OpenAPI document, /health,
│                    then each module's router; exports AppType
├── client.ts        what the web app imports (api/client): Hono's typed client and AppType
├── core/            shared by every module, knows no feature
│   ├── errors.ts    notFound, onError: every error answers { error }
│   ├── openapi.ts   createRouter(), ErrorSchema
│   └── rate-limit.ts  rateLimit(): requests per client IP, 429 { error } past the limit
└── modules/
    └── <module>/
        ├── <module>.routes.ts    HTTP only: route definitions and thin handlers
        ├── <module>.schemas.ts   Zod schemas: what goes in and out
        └── <module>.service.ts   the logic: plain functions, no Hono, no Context
tests/
├── app.test.ts                  what crosses modules: 404s, the OpenAPI document
├── core/                        mirroring src/core/
└── modules/<module>/            one folder per module, mirroring src/modules/
```

## Module rules

- **Routes are thin.** A handler reads validated input (`c.req.valid(…)`), calls the service, and answers
  `c.json(result, status)`. Logic goes in the service.
- **Services don't know about HTTP.** They take and return plain values, so they're testable without
  requests and reusable by other modules. A domain failure is an `HTTPException` with a 4xx status, or a return
  value the route turns into one.
- **Modules talk through services.** A module may import another module's `*.service.ts` (and its types), never its
  routes. If two modules need the same thing, it moves to `core/`.
- **`core/` never imports from `modules/`.**

## Request flow

1. The server (`server/src/server.ts`) sends `/api` and `/api/*` to `createApp().fetch`. The app's base path is
   `/api`, so routes are written without it (`/hello/{name}` answers `/api/hello/{name}`).
2. The request is logged (Hono's `logger()`: `<-- GET /api/hello/world`, then `--> GET /api/hello/world 200 3ms`;
   not `/api/health`; tests show them only when one fails). Then `secureHeaders()` and the rate limit (see below)
   run, then the module route.
3. Zod checks params, query and body against the route's schemas. Invalid input answers `400 { error }`
   with Zod's readable message; the handler doesn't run.
4. Errors end in `core/errors.ts`: an `HTTPException` below 500 answers `{ error: message }` (or the response a
   middleware built), anything else is logged and answers `{ error: "Internal Server Error" }`, with the
   `HTTPException`'s own 5xx status (a 503 stays a 503) or 500.
   Unknown paths answer `404 { error: "Not Found" }`.

Every error body the API builds is `{ error: string }` (`ErrorSchema`), which the web app reads into `ApiError`.
A response a middleware built (like `basicAuth`'s 401) passes through as is; `ApiError` then carries its status text.

## Rate limits

Every client gets 300 requests a minute across `/api` (`/api/health` isn't counted), set in `app.ts`. Past it, a
request answers `429 { error }` with `Retry-After`, and the web app shows that message (its query client doesn't
retry a 4xx). Every answer carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`.

A route that's worth abusing (a login, a sign-up, an email) adds a stricter limit of its own, on top, in its
module's chain and before the route: Hono runs middleware in the order it's added, so one added after the route
never runs.

```ts
export const booksRoutes = createRouter()
  .use("/books/import", rateLimit({ limit: 5, windowMs: 60_000 }))
  .openapi(importBooks, (c) => c.json(importFromFile(c.req.valid("json")), 200));
```

- Clients are told apart by IP (`clientIp` in `core/rate-limit.ts`). Behind a reverse proxy, set `TRUST_PROXY=true`
  (the Docker image does) so it reads the client's IP from `X-Forwarded-For`; without it every request looks like
  the proxy's and all clients share one limit. Never set it without a proxy: clients can send that header. Any value
  but `true` or `false` fails at start, so a typo can't turn it off silently.
- The counts live in the process's memory, so they reset on restart and each instance counts on its own. With
  several instances, pass a shared `store` (`RedisStore` from
  [hono-rate-limiter](https://github.com/rhinobase/hono-rate-limiter), on Valkey or Redis).

## Adding a module

Say, `books`:

1. `modules/books/books.schemas.ts`: the shapes, named for the OpenAPI document.

   ```ts
   import { z } from "@hono/zod-openapi";

   export const BookSchema = z.object({ id: z.string(), title: z.string() }).openapi("Book");

   export const BookParamsSchema = z.object({
     id: z.string().openapi({ param: { name: "id", in: "path" } }),
   });
   ```

2. `modules/books/books.service.ts`: the logic.

   ```ts
   import { HTTPException } from "hono/http-exception";

   /** A stand-in for a database. */
   const books = new Map([["1", { id: "1", title: "Dune" }]]);

   export function findBook(id: string) {
     const book = books.get(id);
     if (!book) throw new HTTPException(404, { message: "No such book" });
     return book;
   }
   ```

3. `modules/books/books.routes.ts`: the HTTP side, with [Zod OpenAPI](https://hono.dev/examples/zod-openapi).

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
       200: {
         content: { "application/json": { schema: BookSchema } },
         description: "The book",
       },
       404: {
         content: { "application/json": { schema: ErrorSchema } },
         description: "No such book",
       },
     },
   });

   export const booksRoutes = createRouter().openapi(getBook, (c) => c.json(findBook(c.req.valid("param").id), 200));
   ```

   Use `createRouter()`, not `new OpenAPIHono()` or `new Hono()`: a bare `OpenAPIHono` answers invalid input with
   Zod's raw `{ success, error }` instead of `400 { error }`, and plain Hono routes are left out of the OpenAPI
   document.

4. Mount it in `app.ts`, in the returned chain: `.route("/", helloRoutes).route("/", booksRoutes)`.
   The chain is what makes `AppType` carry the routes, so keep it one expression.

5. Test it in `tests/modules/books/`: the service directly, and the routes with `createApp().request("/api/books/1")`.
   Run the tests from the repo root with `bun run test`.

The module then shows up in `/api/openapi.json`, and the web app calls it as
`api.books[":id"].$get({ param: { id } })`, typed from its schemas. A handler's `c.json(…)` must match a declared
response (status and shape), or `bun run check` fails, so the document can't drift from the API.

## Conventions

- Imports use `@api/…` for `src/`, with explicit `.ts` extensions, except within a folder: a module's own files
  import each other with `./` (`./books.service.ts`).
- Files are named `<module>.<role>.ts`, so open tabs and search results say which module they belong to.
- Status codes are explicit in `c.json(body, status)`, so the client can tell responses apart.
- Comments go above the code they explain (doc comments), not inside function bodies or at the end of a line.
