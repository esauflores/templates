# web

The React app, served for every path that isn't `/api`. Bun bundles it from `index.html` (no Vite dev server or
build), and it calls the API through Hono's [typed client](https://hono.dev/docs/guides/rpc#client), so the API's
routes are its types. `pages/Home.tsx` is the example to copy.

| Piece   | What                                                                                     |
| ------- | ---------------------------------------------------------------------------------------- |
| UI      | React 19, [shadcn/ui](https://ui.shadcn.com) components, Tailwind CSS 4                  |
| Routing | [React Router](https://reactrouter.com) (`<BrowserRouter>` and `<Routes>` in `main.tsx`) |
| Data    | [TanStack Query](https://tanstack.com/query), over Hono's typed client                   |
| Tests   | Vitest browser mode (through Vite+), in headless Chromium, with Testing Library          |

## Layout

```
src/web/
├── index.html       the entry: Bun bundles the script it loads (main.tsx) and everything it imports
├── public/          files served at their own paths (/robots.txt, /llms.txt), checked on every load
├── assets/          files the page links (favicon.svg), bundled under a hashed name, kept by browsers
├── main.tsx         the router and the QueryClientProvider; one route per page
├── env.d.ts         Bun's import.meta.hot, as main.tsx uses it
├── components.json  shadcn's settings: where its components go, the stylesheet, the aliases
├── components/      the app's own components (ApiStatus, ThemeToggle)
│   └── ui/          shadcn components, once added with bunx shadcn add (yours to edit)
├── lib/
│   ├── api.ts       api (a typed client per API module), call(), ApiError, createQueryClient()
│   ├── theme.ts     light or dark: the .dark class on <html>, saved in localStorage
│   └── utils.ts     cn(): merges Tailwind classes, used by the components
├── mocks/           the API, mocked for the tests (see Tests)
│   ├── worker.ts    MSW's handlers, one per endpoint, and its worker
│   └── setup.ts     starts the worker before each test file, resets its handlers after each test
├── pages/           one component per route
├── styles/
│   ├── fonts.css       Geist and Geist Mono, Latin only (inlined by Bun when it bundles the CSS)
│   ├── global.css      Tailwind, shadcn's additions (from the shadcn package), and the theme (colors, fonts,
│   │                   radius) as CSS variables, light and dark
│   └── generated.css   generated: Tailwind's compilation of the above, imported by main.tsx (ignored by git)
└── tsconfig.json    DOM and JSX in place of Bun's types
```

Every path that isn't `/api` or a file gets `index.html`, and React Router picks the page; unknown ones are sent to `/`.
Tailwind finds the classes in the source files, so there's no Tailwind config: `bun run dev` and `bun run build` run
its CLI (`scripts/css.ts`) over `styles/global.css` into `styles/generated.css` (ignored by git), which `main.tsx`
imports so Bun bundles it with the page, and dev rebuilds it as the sources change.

## Calling the API

Through `api` and `call` from `lib/api.ts`, never `fetch`: `call(api.notes.$get({ query: {} }))` returns the typed
body, or throws an `ApiError` carrying the API's `{ error }` message. A renamed field or param is then a type error
that `bun run check` catches. The [`web-api-call`](../../.agents/skills/web-api-call/SKILL.md) skill has the patterns
for reading, changing and testing.

## Adding a page

1. `pages/Books.tsx`: a component exporting `Books`, reading data with `useQuery`.
2. Its route in `main.tsx`, before the `*` fallback: `<Route path="/books" element={<Books />} />`.
3. `pages/Books.test.tsx`: render it, assert on the screen (see [Tests](#tests): the API is mocked by MSW).

## Components and theme

`bunx shadcn add card --cwd src/web` puts a component in `components/ui/`, as source to edit: `--cwd` is what finds
`components.json` here, and its aliases (`@/web/…`) resolve from this folder through the `paths` in `tsconfig.json`.
shadcn's registry writes `import { cn } from "cn"` and adds the `cn` package: change the import to
`@/web/lib/utils.ts`, run `bun remove cn`, then `bun run check:fix`.

Use the theme's classes (`bg-background`, `text-destructive`, …), not raw colors, and a class only from a file Tailwind
scans (`src/`, from the repo root), or it won't be in the stylesheet. Next to shadcn's, the template adds
`brand` (the lime accent; `brand-text` for text), `subtle`, `edge` (a stronger border), `success`, `success-muted`,
`destructive-muted`, `code` and `code-string`. A new one is a variable in both blocks of `global.css` (light in
`:root`, dark in `.dark`) and a `--color-*` in `@theme`. Icons come from [Lucide](https://lucide.dev).

## Tests

They run in headless Chromium (`bunx playwright install chromium` once), with the API mocked in the browser by
[MSW](https://mswjs.io): `mocks/worker.ts` has one handler per endpoint, `mocks/setup.ts` (vite.config.ts's
`setupFiles`) starts its service worker before each test file, and a test overrides a route for its own case:

```tsx
import { http, HttpResponse } from "msw";

import { worker } from "@/web/mocks/worker.ts";

worker.use(http.get("/api/books", () => HttpResponse.json({ error: "Nope" }, { status: 503 })));
```

- **No server, no database, no port.** Requests are answered inside Chromium, so the suite stays hermetic and fast.
- **Error paths the real API never answers** — a 502 with no body, a health check that's down, a timeout — are one
  `worker.use(…)` away.
- **A missing handler is loud:** anything unmocked answers `500 { error: "No handler for …" }`, which shows on screen.
- The default handlers hold no state: a test that writes and reads back (a list that grows after a POST) overrides
  both routes over a list of its own; the overrides are reset between tests.
