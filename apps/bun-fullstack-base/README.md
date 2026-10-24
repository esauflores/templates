# Bun fullstack base

A Hono API and a React web app, served by one Bun process on one port, typed end to end: the API validates its input
with Zod, documents itself from the same schemas, and types the web app's client, so a renamed field fails
`bun run check` instead of production.

| Part    | What                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Server  | [Bun](https://bun.com) 1.4: `Bun.serve` runs the API and serves the web app, which Bun bundles                                        |
| API     | [Hono](https://hono.dev) with [Zod](https://zod.dev) and [hono-openapi](https://github.com/rhinobase/hono-openapi), by feature module |
| DB      | SQLite, the copy inside Bun (`bun:sqlite`), in the process, through Drizzle                                                           |
| Web     | React 19, React Router, TanStack Query, Tailwind CSS 4, shadcn/ui                                                                     |
| Tooling | [Vite+](https://viteplus.dev) (`vp`): format, lint, type-check, and tests (web in headless Chromium)                                  |

## Getting started

Needs Bun 1.4 or later ([installation](https://bun.com/docs/installation)).

```sh
bun install
bunx playwright install chromium   # once, for the web tests
bun run dev                        # http://localhost:3000, API docs at /api/docs
```

| Script                | What it does                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `bun run dev`         | Serve with hot reload: the page, its stylesheet and the API on their files' changes |
| `bun run build`       | Compile the stylesheet, then bundle the server, the API and the page into `dist/`   |
| `bun run start`       | Serve that build in production mode (run `build` first)                             |
| `bun run check`       | Format check, lint and type-check everything (`check:fix` fixes what it can)        |
| `bun run test`        | API and web (headless Chromium) tests (`test:watch` reruns on change)               |
| `bun run db:generate` | Write a migration for the tables changed since the last one (the server applies it) |
| `bun run bench`       | Benchmark the built server over HTTP with oha (`scripts/bench.ts`)                  |

Run every script from the root. Every setting has a default; to change one, copy `.env.example` to `.env`. The
database is `data/app.db`, created on the first start.

## How it fits together

```
                        ┌─ /api, /api/*     →  src/api  createApp(): Hono, base path /api
browser ── :3000 ── src/server.ts
                        └─ everything else  →  src/web  index.html, bundled by Bun; React Router picks the page
```

- **One origin, one package.** The page and the API share a port (no CORS, no proxy) and a `package.json`. The web
  app may import only types from `@/api/`, a lint rule, so none of the API's code reaches the page.
- **Bun bundles the web app**, on request with hot reload in dev, ahead of time for production (`scripts/build.ts`).
  Vite+ only checks and tests. The stylesheet is not Bun's: Tailwind's own CLI compiles it (`scripts/css.ts`, run
  by `scripts/build.ts` and `scripts/dev.ts`), then Bun bundles it with the page like any other file.
- **Typed and documented as it's written.** Routes validate their input with Zod (`400 { error }` when it's invalid),
  the web app's clients take their types from the routes, and `/api/openapi.json` (Swagger UI at `/api/docs`) is built
  from them.
- **One error shape**: every error is `{ error: string }`, which the web app's `call()` turns into an `ApiError`.

## Adding a feature

An API module, a page that calls it, and tests for both. The steps are written as
[Agent Skills](https://agentskills.io), which people can follow too:
[`api-module`](.agents/skills/api-module/SKILL.md) (a new module),
[`api-endpoint`](.agents/skills/api-endpoint/SKILL.md) (another route in a module) and
[`web-api-call`](.agents/skills/web-api-call/SKILL.md) (calling the API from a page). Then
`bun run check:fix && bun run check && bun run test`.

## Layout

```
src/
├── server.ts       Bun.serve: /api to the API, the rest to the web app; the port, graceful shutdown
├── static.ts       the web app's routes: as Bun bundles them (dev), or the built files from memory (production)
├── api/            the Hono API: app.ts, drizzle.config.ts, core/ (config, db and its migrations/, limits, router), a
│                   folder per module → src/api/README.md
└── web/            the React app: index.html, main.tsx, lib/api.ts (the typed clients), components.json (shadcn),
                    pages/, public/ → src/web/README.md
scripts/
├── dev.ts          bun run dev: the server, and the stylesheet rebuilt as src/web changes
├── build.ts        the production build into dist/, the stylesheet compiled first
├── css.ts          the stylesheet, compiled by Tailwind's CLI for dev.ts and build.ts
└── bench.ts        the benchmark: the built server under HTTP load with oha, run locally
.agents/skills/     the steps for adding API modules, endpoints and API calls
tsconfig.json       TypeScript settings and the @/ alias, extended by src/web/tsconfig.json
vite.config.ts      Vite+ format, lint and test settings: api (Bun) and web (Chromium) test projects
Dockerfile          the production image
bench.Dockerfile    the benchmark from inside a cloud project (see "On Railway" under Benchmark)
.env.example        the settings and their defaults, to copy to .env when changing one
```

## Dev and production

- **Dev** (`bun run dev`) listens on `127.0.0.1` only. One `bun --hot` server hot-reloads the page and the API, and
  `scripts/dev.ts` rebuilds `src/web/styles/generated.css` (ignored by git, imported by `main.tsx`) when `src/web`
  changes, with Tailwind's CLI rather than its `--watch`, which wants a native watcher some installs block.
- **Build** (`bun run build`) compiles that stylesheet, then bundles `src/server.ts` with everything it imports into
  `dist/`, minified by Bun: the page and its CSS as hashed files, and the migrations. A broken import fails here, not on
  a request, and `dist/` runs without `node_modules`.
- **Production** (`bun run start`) serves the page's files from memory, from any working directory: hashed files
  cached for a year, `index.html` and `public/` checked on every load. Each is one fixed answer, the same bytes to every
  client, so Bun serves it on its fast path and answers the ETag and the 304 itself. The text files are gzipped once,
  by the build, and always answered so (every browser accepts gzip): no compression runs per request.

## Docker

```sh
docker build -t bun-fullstack-base .
docker run --rm -p 3000:3000 -v app-data:/data bun-fullstack-base   # settings with -e PORT=… or --env-file .env
```

A two-stage build: Debian to install and build, Alpine to run `dist/` as the `bun` user, about 150 MB in all. Nothing
native is loaded (SQLite is Bun's own), which is what makes Alpine work; a native module added later needs a musl
build. The database lives in the `/data` volume: mount one there, or it's lost with the container. A bind mount
(`-v $PWD/data:/data`) must be writable by uid 1000 (`sudo chown -R 1000:1000 data`), or the server exits at start
with `SQLiteError: unable to open database file`. The `HEALTHCHECK` calls `/api/health`, which reads the database
too.

Put a reverse proxy (Caddy, nginx, your platform's) in front: it terminates TLS, compresses the API's answers (Caddy:
`encode zstd gzip`; nginx: `gzip on` and its MIME types), passes the page's already gzipped files through, and can add
headers of its own (HSTS). Run the image with `-e TRUST_PROXY=true` behind it, so the rate limit counts the client's
IP, not the proxy's ([Rate limits](src/api/README.md#rate-limits)); it's off by default, as without a proxy any client
could send its own X-Forwarded-For.

## Benchmark

`bun run bench` builds, then loads each route with [oha](https://github.com/hatoo/oha) (`cargo install oha`), 3
rounds each on a fresh server and a fresh copy of a database of a million notes (46 MB). There's one route per kind of work: the page (a small static
file), the JS bundle (a large one), `/api/hello` (the API's own cost, no database), a page of notes (a read) and
adding a note (a write). A route doing a different kind of work (a search, a join, an upload) earns a row; another
write by id wouldn't.

Each route is measured twice: straight to the server, and behind [Caddy](https://caddyserver.com) with `encode zstd
gzip` (`caddy` must be installed), as in production. Bun 1.4.3 on an Intel i5-1135G7 (Linux, performance power
profile), the server pinned to one core, Caddy to another and oha to four others (`SERVER_CPU`, `PROXY_CPUS`,
`LOAD_CPUS` in `bench.ts`), 100 connections, 5 s per round, no rate limit (`RATE_LIMIT=0`). Medians, with the range in
brackets:

|                                    | Built (`dist/`)                       | Behind Caddy                    |
| ---------------------------------- | ------------------------------------- | ------------------------------- |
| Ready to answer                    | 47 ms [46–63], each on a new database |                                 |
| First page request                 | 0.2 ms                                |                                 |
| Memory, started / loaded           | 50 / 65 MB RSS, own 12 / 26 MB        |                                 |
| `/` (index.html)                   | 279k req/s [278–279k], p99 0.7 ms     | 18k req/s [18–18k], p99 14.5 ms |
| JS bundle (338 KB, 107 KB gzipped) | 77k req/s [77–77k], p99 2.5 ms        | 11k req/s [11–11k], p99 23.6 ms |
| `/api/hello/{name}`                | 64k req/s [64–64k], p99 3.5 ms        | 15k req/s [15–16k], p99 16.6 ms |
| `GET /api/notes` (a page of 20)    | 24k req/s [24–24k], p99 8.9 ms        | 14k req/s [14–14k], p99 18.3 ms |
| `POST /api/notes`                  | 27k req/s [27–27k], p99 7.8 ms        | 14k req/s [14–14k], p99 17.9 ms |

- First page request and memory are measured by hand. Most of the memory is Bun's own executable, shared between
  instances; the server's own is 12 MB idle and 26 MB under load.
- The build's gzip copies are what make the static rows: without them the JS bundle measured 26k req/s straight
  (three times the bytes) and 0.4k behind Caddy, which compressed its 338 KB again on every request.
- Behind Caddy, the proxy is most of the cost: one more hop per request, on a core of its own.
- A million notes cost the database routes nothing measurable (50 notes gave the same numbers): a page is found by
  id (`WHERE id < ? ORDER BY id DESC`), a walk down the primary key's B-tree, and an insert appends to it. A query
  that scans (a search, an `OFFSET`) would slow with the table.
- On the database routes the query is most of the time. Two settings keep it fast: the queries are prepared once
  (`notes.service.ts`), about half again the requests a second, and `synchronous = NORMAL` (`core/db.ts`) syncs the
  disk at checkpoints, which keeps writes in the tens of thousands a second rather than a few hundred.
- The request log (Hono's `logger()`, two lines a request) is cheap here because the benchmark discards the output;
  writing to a terminal or a log collector costs more.
- One process per database: SQLite serializes writers, so a second instance on the same file would wait, not help.
- A power-saving profile cuts every number by half or more. Numbers vary between machines.

### On Railway

The same routes on [Railway](https://railway.com), loaded from inside the project: the app from the `Dockerfile`
with a volume at `/data`, and a second service built from `bench.Dockerfile` (oha, 4 vCPU) loading it over the
private network, so nothing goes out as paid egress. That service first fills the database to a million notes
through the API, then runs 3 rounds of 5 s per route, all on the one running server. `us-west2`, 100 connections,
`RATE_LIMIT=0`. Medians, with the range in brackets:

|                                 | 0.5 vCPU, 0.5 GB                    | 1 vCPU, 1 GB                        |
| ------------------------------- | ----------------------------------- | ----------------------------------- |
| `/` (index.html)                | 34k req/s [34–34k], p99 24.4 ms     | 38k req/s [37–47k], p99 7.3 ms      |
| JS bundle                       | 31k req/s [30–33k], p99 25.0 ms     | 47k req/s [44–47k], p99 5.7 ms      |
| `/api/hello/{name}`             | 11k req/s [11–11k], p99 40.4 ms     | 25k req/s [23–25k], p99 11.8 ms     |
| `GET /api/notes` (a page of 20) | 4.9k req/s [4.8–5.2k], p99 68.1 ms  | 13k req/s [12–14k], p99 19.4 ms     |
| `POST /api/notes`               | 4.3k req/s [4.1–4.9k], p99 105.4 ms | 3.9k req/s [3.3–5.0k], p99 154.0 ms |

- A Railway vCPU is a share of a server's, slower than a laptop core: the API routes do about half the local numbers
  on 1 vCPU, and half again on 0.5, where the p99 triples. 2 vCPU measured the same as 1: the server's JavaScript
  runs on one thread, and it used 0.95 vCPU at most.
- Writes stay at 4–5k a second whatever the CPU, as SQLite's checkpoints sync to the volume, slower than a laptop's
  SSD; the seeding ran at the same 4.6k a second.
- The static files cost the server little either way: around 45k req/s is near what the private network and oha
  carry.
- The request log goes past Railway's 500 lines a second, which drops the rest, and writing it still costs CPU.
- The server used about 110 MB, so 0.5 GB is plenty.

## Conventions

- Imports use `@/…` for `src/` (`@/api/core/db.ts`), with explicit `.ts`/`.tsx` extensions, and `./` within a folder.
- Tests sit next to the code they test, as `<name>.test.ts` (`.test.tsx` for components).
- Comments go above the code they explain (doc comments), not inside function bodies or at the end of a line.
- Lines wrap at 120 characters; `bun run check:fix` formats and sorts imports.
- Every script says `bun --bun`, so a package's binary (`vp`, `drizzle-kit`) runs on Bun, the runtime the app runs on,
  instead of the Node its shebang asks for. There's no bunfig.toml to do it for every script.
