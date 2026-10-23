# server

The one Bun process: `Bun.serve` puts the API (`apps/api`) under `/api` and the web app (`apps/web`) on every other
path, on one port. It isn't an app of its own: it imports both by their workspace names (`"api"`,
`"web/index.html"`) and runs them, in development and in production.

## Layout

```
src/
├── server.ts       Bun.serve: the routes, the port, graceful shutdown on SIGTERM and SIGINT
└── page.ts         pageRoutes(): the web app's routes (the page and public/), as Bun bundles them (dev) or as built
build.ts            the production build into dist/, copies of web's public/ and the API's migrations, and the
                    gzip copies of the page's files
bunfig.toml         Tailwind as Bun's bundler plugin, for dev
tests/
├── build.test.ts   runs the production build: the page is there and its CSS went through Tailwind
└── page.test.ts    pageRoutes() with a built page: from memory, gzipped, with cache headers, and public/
```

## Dev and production

- **Dev** (`bun run dev`): `bun --hot src/server.ts`, from `server/`, where Bun reads `bunfig.toml`. Bun bundles the
  page as it's requested and hot-reloads it; `--hot` reloads the API. It listens on `127.0.0.1` only.
- **Build** (`bun run build`): `build.ts` bundles `server.ts` with everything it imports, the API and the page
  included, minified, into `dist/`, which mirrors the repo (`dist/server/src/server.js`,
  `dist/apps/web/index.html`, the page's hashed JS and CSS). Each of the page's files gets a gzip copy (level 9,
  kept when smaller). A broken import fails here, not on a request. The API's migrations are copied in, so `dist/`
  runs without `node_modules`; the database needs nothing else, as it's the SQLite inside Bun.
- **Production** (`bun run start`): runs `dist/server/src/server.js` from `dist/`, as the built server finds the
  page's files from its working directory. `page.ts` reads them once at start and answers each with one fixed
  response, from memory:
  - The gzip copy, when there is one, with `Content-Encoding: gzip`: every browser accepts gzip.
  - `Cache-Control: public, max-age=31536000, immutable` on the hashed files, `no-cache` on `index.html`, so a new
    deploy shows at once. Bun answers `304` itself when the browser's ETag matches.
  - The web app's `public/`, copied into `dist/` by the build, is served the same way, each file at its own path
    (`/robots.txt`), with `no-cache` as its names aren't hashed.
  - One fixed response per file keeps Bun's fast path for static responses: no code runs per request.

Request bodies are only read by the API, which caps them at `MAX_BODY_BYTES` (1 MB when unset, `413 { error }` past
it). Above that, Bun's own cap of 128 MB still applies to the whole server.

The `.env` at the repo root is loaded by `dev` and `start` (`--env-file`); a variable already set wins over it. The
Docker image runs the same `dist/`, with settings from `docker run -e` or `--env-file`.

## Benchmark

The production build (`dist/`) on the template's own page and API, measured with `bun run bench` (see
[`bench/`](../bench/README.md)).

Setup: Bun 1.4.3 on an Intel i5-1135G7 (Linux, plugged in, performance power profile), the server pinned to one core
(`taskset -c 1`), the load from [oha](https://github.com/hatoo/oha) on four others, 100 connections, 5 s per target,
sending a browser's `Accept-Encoding`. Medians of 3 rounds, with the range in brackets. The API ran without its rate
limit (`RATE_LIMIT=0`), as all the load comes from one client, where real traffic comes from many, each round on a
fresh database of 50 notes.

|                                 | Built (`dist/`)                       |
| ------------------------------- | ------------------------------------- |
| Ready to answer                 | 55 ms [52–57], each on a new database |
| First page request              | 0.2 ms                                |
| Memory, started / loaded        | 50 / 65 MB RSS, own 12 / 26 MB        |
| `/` (index.html)                | 267k req/s [262–269k], p99 0.8 ms     |
| JS bundle (105 KB gzipped)      | 70k req/s [67–70k], p99 2.8 ms        |
| `/api/hello/{name}`             | 65k req/s [63–65k], p99 3.6 ms        |
| `GET /api/notes` (a page of 20) | 24k req/s [23–24k], p99 9.6 ms        |
| `POST /api/notes`               | 27k req/s [26–27k], p99 8.4 ms        |
| `PATCH /api/notes/{id}`         | 29k req/s [29–30k], p99 8.3 ms        |

- The page is bundled ahead of time, so the first request is answered at once, from memory: the bundler and
  Tailwind aren't loaded at runtime.
- Most of the memory is Bun's own executable (about 24 MB of it in memory), mapped from disk: shared between
  instances, and given back to the kernel when it needs it (`docker stats` leaves it out). The server's own memory is
  12 MB idle (Hono, Zod, the OpenAPI schemas, the page's files, the database's engine) and 26 MB under load
  (connection buffers, compiled code). Bun's `--smol` and smaller GC settings didn't lower it.
- The database is SQLite inside Bun's own executable (`bun:sqlite`), so there's no addon to map and nothing platform
  specific in `server/dist/`. Opening the file and checking the migrations takes a few of the 55 ms above, and the
  engine's memory is part of the server's own, above.
- On the database routes the query is most of the time, and it grows with the rows, turning SQLite's rows into
  Drizzle's objects (`bench/api.bench.ts` measures the queries in the process). Hence pages of 20 by default.
- Two things raise the database routes by half again or more, measured in the process: the page's query and the
  insert are prepared once (`notes.service.ts`), 52k to 79k pages a second and 135k to 233k inserts; and
  `synchronous = NORMAL` (`core/db.ts`) syncs the disk at checkpoints rather than on each commit, which is what keeps
  the writes above in the tens of thousands a second rather than a few hundred.
- Writes vary more between rounds than reads. The update (always note 25 here) rewrites one row, while the insert
  adds one.
- The request logger is the API's biggest cost after the database: about half of `/api/hello`'s time in the process.
  Writing one line per request once answered (`core/logger.ts`), instead of Hono's `logger()` in an `except()` (two
  lines), took `/api/hello` from 49k to 61k req/s, `GET /api/notes` from 19k to 22k and `POST` from 7.5k to 8.5k (6
  rounds each, alternating, measured before the database change). Of the rest, `secureHeaders()` costs about 3 µs a
  request and the body limit 1.5 µs; Drizzle's row mapping costs nothing measurable against SQLite's own.
- One core tops out around 65k requests a second on the API and 265k on the HTML, far beyond what one instance
  usually sees. It's one process per database: SQLite serializes the file's writers, so a second instance on the same
  file waits on its locks instead of answering alongside the first.
- On a power-saving profile the core runs at about a third of its clock and every number drops by half or more.

To rerun it, `bun run bench` (needs oha): it builds, then prints the table's rows. Numbers vary between machines.
First page request and memory are measured by hand.
