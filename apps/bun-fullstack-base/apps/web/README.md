# web

The React app, served by `server/` for every path that isn't `/api`. Bun bundles it from `index.html`:
no Vite dev server, no Vite build. It talks to the API through Hono's
[typed client](https://hono.dev/docs/guides/rpc#client), so the API's routes are its types. `pages/Home.tsx` is the
working example to copy.

| Piece   | What                                                                             |
| ------- | -------------------------------------------------------------------------------- |
| UI      | React 19, [shadcn/ui](https://ui.shadcn.com) components on Radix, Tailwind CSS 4 |
| Routing | [React Router](https://reactrouter.com) (`createBrowserRouter` in `main.tsx`)    |
| Data    | [TanStack Query](https://tanstack.com/query), over Hono's typed client           |
| Tests   | Vitest browser mode (through Vite+), in headless Chromium, with Testing Library  |

## Layout

```
index.html           the entry: Bun bundles the script it loads (src/main.tsx) and everything that imports
public/              files index.html links (favicon.svg), bundled with a hashed name
src/
├── main.tsx         the router and the QueryClientProvider; one route per page
├── env.d.ts         types for CSS imports and Bun's import.meta.hot
├── components/
│   └── ui/          shadcn components, added with bunx shadcn add (yours to edit)
├── lib/
│   ├── api.ts       api (the typed client), call(), ApiError, createQueryClient()
│   └── utils.ts     cn(): merges Tailwind classes, used by the components
├── pages/           one component per route
└── styles/
    ├── global.css   Tailwind, shadcn's theme (colors, radius) as CSS variables
    └── shadcn.css   shadcn's Tailwind additions (animations, variants), copied so shadcn stays a dev tool
tests/
├── lib/             mirroring src/lib/: call() and ApiError
├── pages/           mirroring src/pages/
└── support/
    ├── fetch.ts     mockApi(): canned API answers in place of fetch
    └── query.ts     createTestQueryClient(): no retries, so errors show at once
```

## How it runs

- **Dev** (`bun run dev`): the server, under `bun --hot`, rebundles on change and hot-reloads the page
  (React Fast Refresh).
- **Production** (`bun run build`, then `bun run start`): `server/build.ts` bundles the page ahead of time,
  minified, into hashed files in `server/dist/`, each with a gzip copy. The built server reads the gzip copies once
  at start and serves them from memory (`server/src/page.ts`): the JS is about 120 KB instead of 385 KB. Browsers
  keep the hashed files for a year and check `index.html` every time.
- **Styles**: `bun-plugin-tailwind` (set in `server/bunfig.toml` for dev, and in `server/build.ts`) compiles
  `global.css`, which `main.tsx` imports. Classes are found in the source files, so there is no Tailwind config.
- **Routes**: the server answers every non-`/api` path with `index.html` (200), and React Router picks the page.
  Unknown paths are sent to `/` in the browser (the `*` route's `<Navigate>`).
- **Static files**: `public/` isn't Vite's: a file is served only when `index.html` links it, under a hashed name
  (`/favicon-6tpqq1kq.svg`). Any other path, `/favicon.ico` included, gets `index.html`.
- **Dev** listens on `127.0.0.1` only; production listens on every interface, for Docker.

## Calling the API

`lib/api.ts` is the only place that knows about HTTP:

- `api` is the client: path segments are properties, params are `[":name"]`, the method is `$get`/`$post`/….
  `api.hello[":name"].$get({ param: { name } })` calls `GET /api/hello/{name}`.
- `call(request)` awaits it and returns the typed body, or throws an `ApiError` (`status`, and `message` from the
  API's `{ error }` body) on a non-2xx answer.

```tsx
const hello = useQuery({
  queryKey: ["hello", name],
  queryFn: () => call(api.hello[":name"].$get({ param: { name: encodeURIComponent(name) } })),
});
```

The types come from the API's `AppType`, so a renamed field or param is a type error here, and `bun run check`
catches it. The `api` package is a dev dependency only for those types: none of its code reaches the bundle.
The client doesn't URL-encode path params, so user input goes through `encodeURIComponent`.

Changes go through `useMutation`, invalidating the queries they affect so they refetch. The `web-api-call` skill in
`.agents/skills/` has the full pattern.

## Adding a page

1. `src/pages/Books.tsx`: a component exporting `Books`, reading data with `useQuery` as above.
2. Add its route in `main.tsx`, before the `*` fallback: `{ path: "/books", element: <Books /> }`.
3. Test it in `tests/pages/books.test.tsx`: mock the API, render it, assert on the screen.

## Components

Add shadcn components from `apps/web/`:

```sh
bunx shadcn add card
```

They land in `src/components/ui/` as plain source to edit. shadcn's registry currently writes `import { cn } from "cn"`
and adds the `cn` package to `apps/web/package.json`: change the import to `import { cn } from "@web/lib/utils.ts";`,
run `bun remove cn` in `apps/web/`, then `bun run check:fix` from the root to format the file.
Colors and radius are the CSS variables in `global.css` (light in `:root`, dark in `.dark`); use the theme's
classes (`bg-background`, `text-destructive`, …) rather than raw colors.

## Tests

Tests run in a real browser (headless Chromium, through Playwright), so install it once with
`bunx playwright install chromium`. They never reach the API: `mockApi` replaces `fetch` with handlers keyed by
`"METHOD /path"` (the path without its query string), and returns the calls made. A call with no handler answers
`500 { error: "No mock for …" }`, so a missing mock shows up as that error on the screen.

```tsx
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the API's greeting", async () => {
  mockApi({
    "GET /api/hello/world": () => ({ body: { message: "Hello, world!" } }),
  });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Home />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("heading", { name: "Hello, world!" })).toBeTruthy();
});
```

`createTestQueryClient()` (`tests/support/query.ts`) turns off retries, so an error shows at once; the app's
`createQueryClient()` retries only a 5xx or a network error, up to 3 times, so a 4xx shows at once too. Cover the
error path too: a handler answering `{ status: 400, body: { error: "…" } }` should put that message on the screen.
Run them from the root with `bun run test`.

## Conventions

- Imports use `@web/…` for `src/`, with explicit `.ts`/`.tsx` extensions, and `./` within the same folder. The API
  is imported by its package name (`import type { AppType } from "api"`), types only: never import the API's code.
  `@api/…` resolves too (`tsconfig.json`), only because the API's own files use it.
- Never `fetch` `/api` by hand: go through `api` and `call`, or the types are lost.
- Comments go above the code they explain (doc comments), not inside function bodies or at the end of a line.
- `hono` stays on the same version here and in `apps/api`, or the client's types break.
