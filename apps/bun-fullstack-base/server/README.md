# server

The one Bun process: `Bun.serve` puts the API (`apps/api`) under `/api` and the web app (`apps/web`) on every other
path, on one port. It isn't an app of its own: it imports both by their workspace names (`"api"`,
`"web/index.html"`) and runs them, in development and in production.

## Layout

```
src/
├── server.ts       Bun.serve: the routes, the port, graceful shutdown on SIGTERM and SIGINT
└── page.ts         pageRoutes(): the web app's routes (the page and public/), as Bun bundles them (dev) or as built
build.ts            the production build into dist/, a copy of web's public/, and the gzip copies of the page's files
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
  kept when smaller). A broken import fails here, not on a request.
- **Production** (`bun run start`): runs `dist/server/src/server.js` from `dist/`, as the built server finds the
  page's files from its working directory. `page.ts` reads them once at start and answers each with one fixed
  response, from memory:
  - The gzip copy, when there is one, with `Content-Encoding: gzip`: every browser accepts gzip.
  - `Cache-Control: public, max-age=31536000, immutable` on the hashed files, `no-cache` on `index.html`, so a new
    deploy shows at once. Bun answers `304` itself when the browser's ETag matches.
  - The web app's `public/`, copied into `dist/` by the build, is served the same way, each file at its own path
    (`/robots.txt`), with `no-cache` as its names aren't hashed.
  - One fixed response per file keeps Bun's fast path for static responses: no code runs per request.

A request body over 1 MB is refused with `413` before anything reads it, declared or chunked (`MAX_BODY_BYTES` in
`server.ts`; Bun's own default is 128 MB). Raise it for uploads. Bun answers that one itself, before the API runs, so
unlike the API's errors it has no `{ error }` body: the web app's `call()` falls back to `Request failed (413)`.

The `.env` at the repo root is loaded by `dev` and `start` (`--env-file`); a variable already set wins over it. The
Docker image runs the same `dist/`, with settings from `docker run -e` or `--env-file`.

## Benchmark

The production build (`dist/`) on the template's own page and API.

Setup: Bun 1.4.3 on an Intel i5-1135G7 (Linux, plugged in, performance power profile), the server pinned to one core
(`taskset -c 1`), the load from [oha](https://github.com/hatoo/oha) on four others, 100 connections, 5 s per target,
sending a browser's `Accept-Encoding`. Medians of 3 rounds, with the range in brackets. For the API, the rate limit
was raised so it's never reached (the limiter still runs).

|                                | Built (`dist/`)                   |
| ------------------------------ | --------------------------------- |
| Ready to answer                | 35 ms [33–37]                     |
| First page request             | 0.2 ms                            |
| Memory, started / loaded       | 35 / 54 MB                        |
| `/` (index.html)               | 273k req/s [272–281k], p99 0.7 ms |
| JS bundle (105 KB gzipped)     | 76k req/s [73–77k], p99 2.5 ms    |
| `/api/hello/{name}`            | 43k req/s [41–43k], p99 6.0 ms    |
| `/api/hello/{name}`, no logger | 63k req/s [62–63k], p99 3.6 ms    |

- The page is bundled ahead of time, so the first request is answered at once, from memory: the bundler and
  Tailwind aren't loaded at runtime.
- The request logger costs about a third of the API's throughput on one core (one line to stdout per request);
  the rate limiter costs nothing measurable.
- One core tops out around 40k requests a second on the API and 270k on the HTML, far beyond what one instance
  usually sees. To use more cores, run more instances behind the proxy.
- On a power-saving profile the core runs at about a third of its clock and every number drops by half or more.

To rerun it: `bun run build`, then from `server/dist/`, `PORT=3130 taskset -c 1 bun server/src/server.js`, and
`oha -z 5s -c 100 -H "Accept-Encoding: gzip" http://127.0.0.1:3130/` (and the JS's `/chunk-….js`, and
`/api/hello/bench`, with the rate limit raised in `apps/api/src/app.ts`). Numbers vary between machines.
