# api

The Hono API, everything under `/api`, on the web app's origin (so no CORS). It's organized by feature: each
**module** is a folder that owns its routes, logic and tables, and `app.ts` only wires them together. `notes/` is the
example to copy; `hello/` is the smallest.

| Endpoint                 | What it answers                                                             |
| ------------------------ | --------------------------------------------------------------------------- |
| `GET /api/health`        | `{ ok: true }` after a `SELECT 1`, so a database that can't answer fails it |
| `GET /api/openapi.json`  | The OpenAPI 3.1 document, built from the modules (not `/health`, `/docs`)   |
| `GET /api/docs`          | Swagger UI on that document, to read and try the API (files from jsDelivr)  |
| `GET /api/hello/{name}`  | `{ message }`: the example module                                           |
| `GET /api/notes`         | `{ notes, next }`: a page, newest first (`?limit=20&before=<next>`)         |
| `POST /api/notes`        | `{ text }` saves a note and answers it, `201`                               |
| `PATCH /api/notes/{id}`  | `{ text }` changes a note's text and answers it; `404` when there's none    |
| `DELETE /api/notes/{id}` | deletes a note, `204` with no body; `404` when there's none                 |

## Layout

```
src/api/
├── app.ts           createApp(): the error answers, the middleware in order, /health, the modules, the document
├── drizzle.config.ts  bun run db:generate: the tables glob and where migrations/ go
├── core/            shared by every module, knows no feature
│   ├── config.ts    config(): every setting from the environment, checked with Zod, with its default
│   ├── db.ts        db: SQLite through Drizzle, migrated at start from migrations/
│   ├── limits.ts    rateLimit() and bodyLimit(), both answering { error }, also usable per route
│   └── router.ts    validate() (checks and documents input), json()/error() for describeRoute
└── <module>/
    ├── <module>.routes.ts    HTTP only: the Zod schemas, the routes and thin handlers
    ├── <module>.service.ts   the logic: plain functions, no Hono
    └── <module>.tables.ts    its tables, when it has any (Drizzle)
```

Every file has its test next to it. `notes.tables.test.ts` checks the tables match the migrations, so a forgotten
`bun run db:generate` fails a test.

To add a module or a route, follow the [`api-module`](../../.agents/skills/api-module/SKILL.md) or
[`api-endpoint`](../../.agents/skills/api-endpoint/SKILL.md) skill.

## Module rules

- **Routes are thin**: destructure the validated input, call the service, answer `c.json(result, status)`.
- **Services don't know about HTTP**: plain values in and out, an `HTTPException` (4xx) for a domain failure.
- **Modules talk through services**, never through each other's routes. What two modules share moves to `core/`, which
  never imports a module.

## Requests

The middleware runs in the order `app.ts` adds it: security headers, the request log (`<--` on arrival, `-->` when
answered), the rate limit and the body limit (`413 { error }` past `MAX_BODY_BYTES`). `/api/health` is mounted before
the log and the limit, so it skips them: Hono runs handlers in the order they're added.

`validate(…)` then checks the route's input (`400 { error }` with Zod's message when it's invalid), and every error
ends in `onError`: an `HTTPException` answers `{ error: message }` with its status, so keep internals out of the
message; anything else is a bug, logged and answered `500 { error: "Internal Server Error" }`. Unknown paths answer
`404 { error: "Not Found" }`.

## Database

SQLite inside Bun (`bun:sqlite`), in the process, with [Drizzle](https://orm.drizzle.team). Its queries are
synchronous, so the services are plain functions.

- **Tables** belong to their module, and only its service queries them.
- **Settings** (`core/db.ts`): WAL, `synchronous = NORMAL` (a power cut can lose the last commits, never the file) and
  foreign keys, each checked at start.
- **Queries that run on most requests are prepared once**, with `sql.placeholder(…)` for the values, as in
  `notes.service.ts`.
- **Migrations**: after changing a table, `bun run db:generate` writes the SQL into `core/migrations/`; commit it. The
  server applies new ones at start. Never edit one that has run: generate another.
- **The file** is `DATABASE_PATH`, `data/app.db` by default (`/data/app.db` in the Docker image). Tests use
  `:memory:`, a fresh database per test file. Run one server per file.

Drizzle 1.0 is still a release candidate: read the changelog before updating it.

## Rate limits

Each client gets `RATE_LIMIT` requests a minute (300 by default, `0` for none), then `429 { error }` with
`Retry-After`. The counts live in memory, per process; with several instances, give `rateLimit` a shared `store`
([hono-rate-limiter](https://github.com/rhinobase/hono-rate-limiter)'s `RedisStore`).

The client is the connection's IP, or behind a reverse proxy, with `TRUST_PROXY=true`, the one the proxy adds to
`X-Forwarded-For`. Never set it without a proxy: clients can send that header. The server prints which at start.

A route worth abusing (a login, a sign-up) adds a stricter limit, in its module's chain before the route:

```ts
export const booksRoutes = new Hono()
  .use("/books/import", rateLimit({ limit: 5, windowMs: 60_000 }))
  .post("/books/import", validate("json", ImportSchema), (c) => {
    const { file } = c.req.valid("json");
    return c.json(importFromFile(file), 200);
  });
```

## Conventions

- Files are named `<module>.<role>.ts`, so open tabs and search results say which module they belong to.
- Status codes are explicit in `c.json(body, status)`, so the client can tell answers apart.
