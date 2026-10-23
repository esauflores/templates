# server

The one Bun process: `Bun.serve` puts the API (`apps/api`) under `/api` and the web app (`apps/web`) on every other
path, on one port. It isn't an app of its own: it imports both by their workspace names (`"api"`,
`"web/index.html"`) and runs them, in development and in production.

## Layout

```
src/
├── server.ts       Bun.serve: the routes, the port, graceful shutdown on SIGTERM and SIGINT
└── page.ts         pageRoutes(): the web app's routes (the page and public/), as Bun bundles them (dev) or as built
build.ts            the production build into dist/, copies of web's public/, the API's migrations and Turso's
                    native addon, and the gzip copies of the page's files
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
  kept when smaller). A broken import fails here, not on a request. The API's migrations are copied in, and Turso's
  native addon (`turso.<platform>.node`) next to `server.js`, as it can't be bundled: `dist/` runs without
  `node_modules`, on the platform it was built on.
- **Production** (`bun run start`): runs `dist/server/src/server.js` from `dist/`, as the built server finds the
  page's files from its working directory. `page.ts` reads them once at start and answers each with one fixed
  response, from memory:
  - The gzip copy, when there is one, with `Content-Encoding: gzip`: every browser accepts gzip.
  - `Cache-Control: public, max-age=31536000, immutable` on the hashed files, `no-cache` on `index.html`, so a new
    deploy shows at once. Bun answers `304` itself when the browser's ETag matches.
  - The web app's `public/`, copied into `dist/` by the build, is served the same way, each file at its own path
    (`/robots.txt`), with `no-cache` as its names aren't hashed.
  - One fixed response per file keeps Bun's fast path for static responses: no code runs per request.

Request bodies are only read by the API, which caps them at 1 MB (`MAX_BODY_BYTES` in `apps/api/src/app.ts`,
answered `413 { error }`). Above it, Bun's own cap of 128 MB still applies to the whole server.

The `.env` at the repo root is loaded by `dev` and `start` (`--env-file`); a variable already set wins over it. The
Docker image runs the same `dist/`, with settings from `docker run -e` or `--env-file`.

## Benchmark

The production build (`dist/`) on the template's own page and API.

Setup: Bun 1.4.3 on an Intel i5-1135G7 (Linux, plugged in, performance power profile), the server pinned to one core
(`taskset -c 1`), the load from [oha](https://github.com/hatoo/oha) on four others, 100 connections, 5 s per target,
sending a browser's `Accept-Encoding`. Medians of 3 rounds, with the range in brackets. The API ran without its rate
limit (`RATE_LIMIT=0`), as all the load comes from one client, where real traffic comes from many, each round on a
fresh database of 50 notes.

|                                 | Built (`dist/`)                     |
| ------------------------------- | ----------------------------------- |
| Ready to answer                 | 60 ms [58–61]                       |
| First page request              | 0.2 ms                              |
| Memory, started / loaded        | 55 / 78 MB RSS, own 17 / 35 MB      |
| `/` (index.html)                | 268k req/s [266–277k], p99 0.8 ms   |
| JS bundle (105 KB gzipped)      | 74k req/s [71–74k], p99 2.7 ms      |
| `/api/hello/{name}`             | 60k req/s [60–61k], p99 4.2 ms      |
| `GET /api/notes` (a page of 20) | 22k req/s [21.6–22.2k], p99 11 ms   |
| `POST /api/notes`               | 8.6k req/s [7.3–8.6k], p99 25 ms    |
| `PATCH /api/notes/{id}`         | 12.3k req/s [12.3–12.4k], p99 17 ms |

- The page is bundled ahead of time, so the first request is answered at once, from memory: the bundler and
  Tailwind aren't loaded at runtime.
- Most of the memory is Bun's own executable (27 MB of it in memory) and Turso's addon (10 MB of its 19 MB), mapped
  from disk: shared between instances, and given back to the kernel when it needs it (`docker stats` leaves it out). The server's own memory is 17 MB
  idle (Hono, Zod, the OpenAPI schemas, the page's files, the database's engine) and 35 MB under load (connection
  buffers, compiled code). Bun's `--smol` and smaller GC settings didn't lower it.
- The database added about 22 ms to the start (opening it and checking the migrations; 70 ms on the very first,
  which creates the tables) and about 20 MB idle, measured the same way against the build before it: 10 MB is
  Turso's addon, 3 MB more of Bun's executable in use, and 7 MB the server's own, 2 MB of it JavaScript (Drizzle,
  Turso's driver, the notes module) and the rest Turso's engine. Under load the server's own memory grew 12 MB
  more than before, on `/api/hello`, which doesn't touch the database: not pinned down.
- On the database routes the query is most of the time, and it grows with the rows: about 1 µs a note, turning
  Turso's rows into Drizzle's objects. Hence pages of 20 by default.
- Two settings in the API more than double the database routes, measured against the same routes without (rate
  limit on): the page's query is prepared once (`notes.service.ts`), 5.9k to 11k pages of 50 a second; and
  `synchronous = NORMAL` (`core/db.ts`) syncs the disk at checkpoints rather than on each commit, 310 to 4.9k writes
  a second, with p99 down from 1.7 s to 45 ms. A bigger page cache made no difference.
- The insert and the update are prepared once too: the insert went from 4.7k to 7.0k notes a second (6 rounds each,
  alternating, no rate limit). Writes vary more between rounds than reads. The update (always note 25 here) rewrites
  one row, while the insert adds one.
- Writing grows the server's memory: after 24k notes in 5 s it was 138 MB RSS, 94 MB its own (78 / 35 MB after the
  API's reads). Not looked into further.
- The request logger is the API's biggest cost after the database: about half of `/api/hello`'s time in the process.
  Writing one line per request once answered (`core/logger.ts`), instead of Hono's `logger()` in an `except()` (two
  lines), took `/api/hello` from 49k to 61k req/s, `GET /api/notes` from 19k to 22k and `POST` from 7.5k to 8.5k (6
  rounds each, alternating). Of the rest, `secureHeaders()` costs about 3 µs a request and the body limit 1.5 µs;
  Drizzle's row mapping costs nothing measurable against Turso's own.
- One core tops out around 60k requests a second on the API and 270k on the HTML, far beyond what one instance
  usually sees. It's one process per database: Turso locks the file to the process that opened it, so a second
  instance on the same file fails at start. (Turso's experimental `multiprocess_wal` lifts that: two processes
  read 1.9 times and write 1.3 times as much, measured, but it isn't on here.)
- On a power-saving profile the core runs at about a third of its clock and every number drops by half or more.

To rerun it: `bun run build`, then from `server/dist/`,
`PORT=3130 RATE_LIMIT=0 taskset -c 1 bun server/src/server.js`, and
`oha -z 5s -c 100 -H "Accept-Encoding: gzip" http://127.0.0.1:3130/` (and the JS's `/chunk-….js`, and
`/api/hello/bench`, and `/api/notes`, a `POST /api/notes` and a `PATCH /api/notes/25` on a fresh database of 50
notes). Numbers vary between machines.
