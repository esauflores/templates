# Bun fullstack base

A Hono API and a React web app, served by one Bun process on one port. It's typed end to end: the API's Zod schemas
validate requests, make up its OpenAPI document and type the web app's client, so a renamed field breaks
`bun run check` and doesn't surface in production.

| Part    | What                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------- |
| Server  | [Bun](https://bun.com) 1.4: `Bun.serve` runs the API and serves the web app, which Bun bundles        |
| API     | [Hono](https://hono.dev) with [Zod OpenAPI](https://hono.dev/examples/zod-openapi), by feature module |
| Web     | React 19, React Router, TanStack Query, Tailwind CSS 4, shadcn/ui                                     |
| Tooling | [Vite+](https://viteplus.dev) (`vp`): format, lint, type-check, and tests (web in headless Chromium)  |

## Getting started

Needs Bun 1.4 or later: `curl -fsSL https://bun.com/install | bash` (or `brew install oven-sh/bun/bun`, or
`npm i -g bun`). See [bun.com/docs/installation](https://bun.com/docs/installation) for Windows and more.

```sh
bun install
cp .env.example .env
bunx playwright install chromium   # once, for the web tests
bun run dev                        # http://localhost:3000
```

| Script          | What it does                                                                            |
| --------------- | --------------------------------------------------------------------------------------- |
| `bun run dev`   | Serve with hot reload: the page on web changes, the API on api changes                  |
| `bun run build` | Bundle the server, the API and the page, minified, into `server/dist/`                  |
| `bun run start` | Serve that build in production mode (run `build` first)                                 |
| `bun run check` | Format check, lint and type-check everything (`check:fix` fixes what it can)            |
| `bun run test`  | API, web (headless Chromium) and production build tests (`test:watch` reruns on change) |

Run every script from the root. `.env` lives at the root too (just `PORT` for now); `dev` and `start` load it. A
`PORT` already set in your shell wins over `.env`.

## How it fits together

```
                        ┌─ /api, /api/*     →  apps/api  createApp(): Hono, base path /api
browser ── :3000 ── server
                        └─ everything else  →  apps/web  index.html, bundled by Bun; React Router picks the page
```

- **One origin.** The page and the API share a port, so no CORS, no proxy, and nothing to configure between them.
- **Bun bundles the web app.** There's no Vite dev server. In dev, Bun bundles the page as it's requested,
  rebundles on change and hot-reloads it (React Fast Refresh). For production, `bun run build` (`server/build.ts`)
  bundles the server with everything it imports, the API and the page included, into `server/dist/`: the page
  becomes hashed JS and CSS files, gzipped, that the built server loads into memory at start, so a broken import
  fails the build, not a request. Tailwind runs as Bun's bundler plugin (`server/bunfig.toml` in dev, `build.ts`
  for the build). [`server/README.md`](server/README.md) has the details and a benchmark.
- **The apps, and the server that runs them.** `apps/api` and `apps/web` are the apps; `server/` puts them on one
  port, importing them by name (`"api"`, `"web/index.html"`). Each is a workspace with its own `package.json` and
  dependencies; the root only holds the tooling and the scripts.
- **Vite+ only checks and tests.** `vp check` and `vp test` (in `vite.config.ts`) cover the server and both
  apps. The root `tsconfig.json` holds the shared settings and the `@api/*` and `@web/*` paths; each package extends
  it, the web app swapping Bun's types for DOM and JSX.
- **Typed end to end.** A route declares its input and its responses with Zod. Invalid input answers
  `400 { error }` before the handler runs. A handler that answers anything undeclared fails the type-check. The
  routes appear in `/api/openapi.json`. The web app's client (`hc<AppType>`) takes its params and response types
  from the same routes, and the API's code never reaches the page's bundle: only its types do.
- **One error shape.** The API answers every error it builds as `{ error: string }`, and the web app's `call()`
  turns it into an `ApiError` whose message can go straight on the screen.

## Adding a feature

1. **An API module** in `apps/api/src/modules/<module>/`: schemas, a service, routes, mounted in
   `apps/api/src/app.ts`. See [`apps/api/README.md`](apps/api/README.md), which walks through a `books` module.
2. **A page** in `apps/web/src/pages/`, routed in `apps/web/src/main.tsx`, calling the new routes through `api` and
   `call`. See [`apps/web/README.md`](apps/web/README.md).
3. **Tests** for both, then `bun run check:fix && bun run check && bun run test`.

Coding agents have the same steps as [Agent Skills](https://agentskills.io) in `.agents/skills/`: `api-module` (a
new module), `api-endpoint` (another route in a module), and `web-api-call` (calling the API from a page, with
tests).

## Layout

```
server/           Bun.serve (/api to the API, the rest to the web app), build.ts             → server/README.md
apps/
├── api/          the Hono API: core/ (errors, OpenAPI router) and modules/                  → apps/api/README.md
└── web/          the React app: lib/api.ts (the typed client), pages/                      → apps/web/README.md
.agents/skills/   Agent Skills for adding API modules, endpoints and API calls
bunfig.toml       package binaries (vp) run on Bun
tsconfig.json     the shared TypeScript settings and import paths, extended by server/ and each app
vite.config.ts    Vite+ format, lint and test settings, with the server, api and web test projects
Dockerfile        the production image
.env.example      the settings, copied to .env
```

## Docker

```sh
docker build -t bun-fullstack-base .
docker run --rm -p 3000:3000 bun-fullstack-base   # pass settings with -e PORT=… or --env-file .env
```

The image (on `oven/bun:1.4.3`, the Bun that `packageManager` pins) is built in two stages. The first installs the
dependencies and runs `bun run build` on Debian slim; the second keeps only `server/dist/` (a few MB, no
`node_modules`) and runs it on Alpine as the `bun` user, about 150 MB in all. Checks and tests run outside it. Its
`HEALTHCHECK` calls `/api/health` every 30 s, so Docker can tell when the server stops answering.

Don't expose the image on its own: put a reverse proxy (Caddy, nginx, your platform's) in front. It terminates TLS,
compresses the API's responses (the page's files come compressed already), and sets security headers on the page
(CSP, `frame-ancestors`, `X-Content-Type-Options`), which the app doesn't: `secureHeaders()` only covers `/api`.
The image sets `TRUST_PROXY=true`, so the API's rate limit counts each client by the IP the proxy puts in
`X-Forwarded-For` (see [`apps/api/README.md`](apps/api/README.md#rate-limits)).

## Conventions

- Imports use `@api/…` and `@web/…` for each package's own `src/`, with explicit `.ts`/`.tsx` extensions. Files in
  the same folder (a module's routes, schemas and service) import each other with `./`. One package imports another
  by its workspace name (`"api"`, `"api/client"`, `"web/index.html"`).
- Tests live in each package's `tests/`, mirroring `src/`.
- Comments go above the code they explain (doc comments), not inside function bodies or at the end of a line.
- Lines wrap at 120 characters; `bun run check:fix` formats and sorts imports.
