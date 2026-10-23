# server

The one Bun process: `Bun.serve` puts the API (`apps/api`) under `/api` and the web app (`apps/web`) on every other
path, on one port. It isn't an app of its own: it imports both by their workspace names (`"api"`,
`"web/index.html"`) and runs them, in development and in production.

## Layout

```
src/
├── server.ts       Bun.serve: the routes, the port, graceful shutdown on SIGTERM and SIGINT
└── page.ts         pageRoutes(): the web app's routes, as Bun bundles them (dev) or as built (production)
build.ts            the production build into dist/, and the gzip copies of the page's files
bunfig.toml         Tailwind as Bun's bundler plugin, for dev
tests/
├── build.test.ts   runs the production build: the page is there and its CSS went through Tailwind
└── page.test.ts    pageRoutes() with a built page: from memory, gzipped, with cache headers
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
  - The gzip copy, when there is one, with `Content-Encoding: gzip`: every browser accepts gzip on any connection.
    Brotli is 13% smaller, but browsers only accept it over HTTPS or on localhost, and a fixed brotli response
    breaks the page anywhere else.
  - `Cache-Control: public, max-age=31536000, immutable` on the hashed files, `no-cache` on `index.html`, so a new
    deploy shows at once. Bun answers `304` itself when the browser's ETag matches.
  - One fixed response per file keeps Bun's fast path for static responses: no code runs per request.

A request body over 1 MB is refused with `413` before anything reads it, declared or chunked (`MAX_BODY_BYTES` in
`server.ts`; Bun's own default is 128 MB). Raise it for uploads.

The `.env` at the repo root is loaded by `dev` and `start` (`--env-file`); a variable already set wins over it. The
Docker image runs the same `dist/`, with settings from `docker run -e` or `--env-file`.

## Benchmark

The production build against Bun bundling the page at runtime (`NODE_ENV=production bun src/server.ts`, what this
template did before `build.ts`), on the template's own page and API.

Setup: Bun 1.4.3 on an Intel i5-1135G7 (Linux), the server pinned to one core (`taskset -c 1`), the load from
[oha](https://github.com/hatoo/oha) on four others, 100 connections, 5 s per target, sending a browser's
`Accept-Encoding`. Medians of 3 alternating rounds, with the range in brackets.

|                          | Built (`dist/`)                 | Bundled at runtime              |
| ------------------------ | ------------------------------- | ------------------------------- |
| Ready to answer          | 46 ms [37–48]                   | 56 ms [55–56]                   |
| First page request       | **5 ms** [5–8]                  | 240 ms [232–245]: it bundles    |
| Memory, started / loaded | **33 / 48 MB**                  | 88 / 108 MB                     |
| `/` (index.html)         | 207k req/s [169–219k], p99 1 ms | 195k req/s [186–213k], p99 1 ms |
| JS bundle                | **56k req/s** [48–57k], 124 KB  | 21k req/s [17–22k], 394 KB      |
| `/api/hello/{name}`      | 62k req/s [57–65k], p99 3.7 ms  | 63k req/s [58–63k], p99 3.8 ms  |

- The build answers at once and uses less than half the memory: the bundler and Tailwind aren't loaded at runtime.
- The page's HTML is as fast either way (Bun's fast path for static responses), and the JS is 2.7× faster built,
  as it's a third of the size gzipped. The API is the same code in both, so the same speed.
- One core tops out around 60k requests a second on the API and 200k on the HTML, far beyond what one instance
  usually sees; past about 200 connections, more connections only add latency. To use more cores, run more
  instances behind the proxy.
- In Docker (`--cpus=1 --memory=256m`), the image (152 MB, Alpine) answered the API at about 59k req/s and used
  14 MB.

To rerun it: `bun run build`, then from `server/dist/`, `PORT=3130 taskset -c 1 bun server/src/server.js`, and
`oha -z 5s -c 100 -H "Accept-Encoding: gzip" http://127.0.0.1:3130/` (and the JS's `/chunk-….js`, and
`/api/hello/bench`). Numbers vary between machines; compare the two columns, not the absolutes.
