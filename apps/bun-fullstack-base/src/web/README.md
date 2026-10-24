# web

The React app, served for every path that isn't `/api`. Bun bundles it from `index.html` (no Vite dev server or
build), and it calls the API through Hono's [typed client](https://hono.dev/docs/guides/rpc#client), so the API's
routes are its types. `pages/Home.tsx` is the example to copy.

| Piece   | What                                                                                     |
| ------- | ---------------------------------------------------------------------------------------- |
| UI      | React 19, [shadcn/ui](https://ui.shadcn.com) components on Radix, Tailwind CSS 4         |
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
├── env.d.ts         types for CSS imports and Bun's import.meta.hot
├── components/      the app's own components (ApiStatus, ThemeToggle)
│   └── ui/          shadcn components, added with bunx shadcn add (yours to edit)
├── lib/
│   ├── api.ts       api (a typed client per API module), call(), ApiError, createQueryClient()
│   ├── theme.ts     light or dark: the .dark class on <html>, saved in localStorage
│   └── utils.ts     cn(): merges Tailwind classes, used by the components
├── pages/           one component per route
├── styles/
│   ├── fonts.css    Geist and Geist Mono, Latin only
│   ├── global.css   Tailwind, and the theme (colors, fonts, radius) as CSS variables, light and dark
│   └── shadcn.css   shadcn's Tailwind additions, copied so shadcn stays a dev tool
├── testing.ts       for tests: mockApi() (canned API answers in place of fetch), createTestQueryClient()
└── tsconfig.json    DOM and JSX in place of Bun's types
```

Every path that isn't `/api` or a file gets `index.html`, and React Router picks the page; unknown ones are sent to `/`.
Tailwind finds the classes in the source files, so there's no Tailwind config.

## Calling the API

Through `api` and `call` from `lib/api.ts`, never `fetch`: `call(api.notes.$get({ query: {} }))` returns the typed
body, or throws an `ApiError` carrying the API's `{ error }` message. A renamed field or param is then a type error
that `bun run check` catches. The [`web-api-call`](../../.agents/skills/web-api-call/SKILL.md) skill has the patterns
for reading, changing and testing.

## Adding a page

1. `pages/Books.tsx`: a component exporting `Books`, reading data with `useQuery`.
2. Its route in `main.tsx`, before the `*` fallback: `<Route path="/books" element={<Books />} />`.
3. `pages/Books.test.tsx`: mock the API with `mockApi`, render it, assert on the screen.

## Components and theme

`bunx shadcn add card` from the repo root puts a component in `components/ui/`, as source to edit. shadcn's registry
writes `import { cn } from "cn"` and adds the `cn` package: change the import to `@/web/lib/utils.ts`, run
`bun remove cn`, then `bun run check:fix`.

Use the theme's classes (`bg-background`, `text-destructive`, …), not raw colors. Next to shadcn's, the template adds
`brand` (the lime accent; `brand-text` for text), `subtle`, `edge` (a stronger border), `success`, `success-muted`,
`destructive-muted`, `code` and `code-string`. A new one is a variable in both blocks of `global.css` (light in
`:root`, dark in `.dark`) and a `--color-*` in `@theme`. Icons come from [Lucide](https://lucide.dev).

## Tests

They run in headless Chromium (`bunx playwright install chromium` once) and never reach the API: `mockApi` answers in
place of `fetch`, keyed by `"METHOD /path"`, and a call with no handler answers `500`, so a missing mock shows on the
screen. `createTestQueryClient()` turns off retries, so errors show at once.
