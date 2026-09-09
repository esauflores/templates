# web-crud-tanstack

An **admin dashboard starter** — a persistent sidebar shell and a broad set of screens.
Sidebar: **Overview** + **Reports** pinned, then _Sales_ (Customers + per-customer detail,
Orders, Invoices, Products), _Workspace_ (Projects, Calendar, Files), _Support_ (Tickets,
Board, Activity feed), _AI_ (streaming Assistant, Prompt library, AI settings), and _Admin_
(Team, Roles, Integrations). Plus a ⌘K command menu, a notifications bell, and
account/billing/settings in the footer menu. No backend: auth, data and the AI model are
local mocks you swap for your API.

Server-rendered with TanStack Start, styled with Tailwind CSS v4 + shadcn/ui and a few compact StyleX dashboard bars.
Deploys as a self-contained Node server (Nitro).

---

# Stack

| Layer          | Choice                                                                                  |
| -------------- | --------------------------------------------------------------------------------------- |
| Framework      | TanStack Start 1 (SSR) on Vite 8                                                        |
| Router         | TanStack Router (file-based, typed) — typed search params                               |
| Server         | Nitro (`node-server` preset)                                                            |
| UI             | React 19, Tailwind CSS v4, shadcn/ui (`new-york`, `neutral`), sidebar shell             |
| Dashboard bars | Small StyleX component — no chart package                                               |
| Tables         | [@tanstack/react-table](https://tanstack.com/table) v9 (`DataGrid`)                     |
| Forms          | react-hook-form + [zod](https://zod.dev) v4 (`@hookform/resolvers`)                     |
| Server st      | [@tanstack/react-query](https://tanstack.com/query) — provider wired, opt-in per screen |
| Dates          | [date-fns](https://date-fns.org) (`lib/format`, `overview/weekly`, calendar)            |
| AI             | mock streaming chat + prompt library (`features/ai/`), `react-markdown`                 |
| Extras         | Motion, sonner, @dnd-kit (board)                                                        |
| Tests          | Vitest + @testing-library (units), Playwright (e2e), v8 coverage                        |
| Tooling        | oxlint + oxfmt                                                                          |
| "Auth"         | Local mock in `src/lib/auth.ts` (localStorage) + client-side `_app` route gate          |
| Env            | `src/env.ts` — zod-validated `import.meta.env` (`VITE_API_URL`)                         |

---

# Architecture

Routes stay thin (path + `<head>` + component); each screen lives in a **feature
folder**, grouped the same way the sidebar is, with its own `data/` (seed arrays +
types — the API-swap seam). Cross-domain screens just import another feature's
`data/` (`Reports` → `sales/data`, `Search` → most of them). Shared shell and
primitives sit outside the features.

```
src/
├── router.tsx / routeTree.gen.ts   # TanStack Start entry + generated tree (committed)
├── routes/                         # file = URL; each just imports its feature's *Content
│   ├── __root.tsx        # <html> doc shell + <MotionConfig> + <Toaster/>
│   ├── _app.tsx          # pathless layout — <SidebarProvider><AppSidebar/><SidebarInset>…
│   ├── _app/*.tsx        # /projects, /customers, /customers/$id, /tickets, /reports, …
│   │                     #   unknown paths → NotFound (root notFoundComponent)
│   └── sign-in.tsx       # /sign-in — full-screen, outside the shell
├── features/                       # one folder per sidebar group
│   ├── overview/         # OverviewContent, ReportsContent (pinned), range-toggle, weekly.ts
│   ├── sales/            # Customers (+ $id detail), Orders, Invoices, Products
│   │   └── data/         #   customers, orders, invoices, products, sv-departments
│   ├── workspace/        # Projects, Calendar, Files          — data/: projects, events, files
│   ├── support/          # Tickets, Board, Activity            — data/: tickets, activity
│   ├── ai/               # Assistant (streaming chat), Prompts (CRUD), AI settings
│   │                     #   lib/: ai.ts (mock streamChat + config), prompt.ts, use-conversations.ts
│   ├── admin/            # Team, Roles, Integrations           — data/: team, roles, integrations
│   └── account/          # Account, Billing, Settings, Notifications, Search, Changelog,
│                         #   GettingStarted, SignInForm  — data/: sessions, billing, changelog, notifications
├── components/                     # shared shell + primitives (no screens, no data)
│   ├── app-sidebar.tsx   # GROUPS array → nav groups + user dropdown (footer)
│   ├── command-menu.tsx  # ⌘K palette (routes + customers), mounted in _app.tsx
│   ├── notification-bell.tsx  # header dropdown, links to /notifications
│   ├── NotFound.tsx / RouteError.tsx  # wired as root notFound / error components
│   ├── crud/             # useCrud, DataGrid (react-table) + DataTable, CrudDialog,
│   │                     #   RowActions/DeleteButton, StatRow, StatusBadge, FormFooter,
│   │                     #   useZodForm (react-hook-form + zod) / Field / SelectField, EmptyState
│   ├── ui/               # shadcn/ui primitives (vendored)
│   └── simple-bars.tsx   # small dashboard bar chart
├── env.ts                # zod-validated `import.meta.env` — import `env`, not `import.meta.env`
├── lib/                            # cross-cutting, genuinely shared
│   ├── auth.ts           # mock session store (signIn / signUp / signOut / useSession) — the auth seam
│   ├── api.ts            # typed `fetch` wrapper + `crudPersist(resource)` for `useCrud({ persist })`
│   ├── query.ts          # `getQueryClient()` — one per SSR request, singleton in the browser
│   ├── format.ts         # currency / fmtDate / daysAgo / fileSize  (used everywhere)
│   └── utils.ts          # `cn` re-export
└── styles.css            # Tailwind entry + shadcn + sidebar theme tokens (light + dark)
```

## The shell

`_app.tsx` wraps every page except `/sign-in` in the shadcn `SidebarProvider` shell:
collapsible left sidebar (`AppSidebar`), a header with the `SidebarTrigger` + current section
title, and `<main>` for the route. Mobile (`< 768px`) shows the sidebar as a sheet drawer.

`AppSidebar` — a `PINNED` array (Overview, Reports) in an unlabelled group, then the `GROUPS`
array (`{ label, items }[]`) rendered as labelled nav groups, and a footer `DropdownMenu` bound
to `useSession()` (Account / Billing / Settings, Changelog, then Sign out or
Sign in). The header carries a **⌘K** button (`CommandMenu`, mounted in `_app.tsx`, jumps to
any page or customer) and a **notification bell** (`NotificationBell`) linking to `/notifications`.

Not every screen is a CRUD table — `BoardContent` (`@dnd-kit` columns; drag, keyboard and touch),
`CalendarContent` (month grid), `ActivityContent` (feed), `ReportsContent` (small dashboard bars),
`RolesContent` (permission
checkbox matrix), and `CustomerDetailContent`
(`/customers/$id`, a record with its related orders / invoices / tickets) show other common shapes
built on the same primitives.

## CRUD pages

Each resource page (`ProjectsContent`, `CustomersContent`, …) is the same shape, ~110–160
lines, built from `src/components/crud/`:

- **`useCrud<T>(seed, noun)`** → `{ items, create, update, remove, removeMany }` — in-memory
  store. Mutations are **optimistic**: they update state immediately, then (if you pass a
  `persist` option) await the write and **roll back + toast the error** on failure — the swap
  point for a real API. `create`/`update`/`remove` fire a `sonner` toast; delete toasts carry an
  **Undo** action that restores the pre-delete snapshot. (`removeMany(ids, label)` takes a `Set`
  — `FilesContent` uses it to delete a folder and its whole subtree.)
- **`<StatRow items={[{label,value,hint}]}/>`** — the KPI card row.
- **`<DataGrid data columns bulkActions storageKey exportName facets empty />`** —
  `@tanstack/react-table` **v9** table: search box, sortable headers, pagination, column
  show/hide, and checkbox selection → a bulk bar (`bulkRemove(removeMany, noun)` wires it to
  `useCrud` in one line). `facets={["status"]}` adds a multi-select dropdown per column id
  (values read from the data). `storageKey` persists sort / search / column-visibility /
  facet filters to `localStorage`; `exportName` adds a **CSV export** button (selected rows,
  else the filtered set); `empty` takes a node — use `<EmptyState message action />` for an
  icon + CTA. Features + row models are
  registered once in `data-grid.tsx` (`GRID_FEATURES`); each resource page supplies `Column<T>[]`
  (a `ColumnDef` bound to that feature set). `<DataTable head rows render empty />` is the plain
  read-only version, still used by the dashboard/detail mini-tables.
- **`<RowActions onEdit onDelete onDuplicate deleteLabel />`** — Edit + optional Duplicate +
  `<DeleteButton>` (an `AlertDialog` confirm).
- **`<CrudDialog title trigger open onOpenChange>`** + **`<FormFooter submitLabel />`** — the
  create/edit `Dialog` and its Cancel/Submit footer. The page supplies a small `<XForm>` built
  on **`useZodForm(schema, defaultValues)`** — `react-hook-form` wired to a `zod` schema via
  `@hookform/resolvers`; returns the usual `UseFormReturn`, and `handleSubmit` hands you the
  parsed output (so `z.coerce` fields are typed). Text inputs use `{...register("field")}` inside
  **`<Field label htmlFor error={errors.field?.message} />`**; Radix selects use
  **`<SelectField control name options />`** (a `Controller` + `<Field>` wrapper).
- **`<StatusBadge label tone />`** — dot + label badge (`green|amber|red|blue|gray`).

Seed data lives in each feature's `data/<resource>.ts`; `OverviewContent` / `ReportsContent`
import across features (`sales/data/*`, …) to compute KPIs and charts.

## Auth & the API seam

**`lib/auth.ts`** — `useSession()` reads a session from `localStorage` (`web:demo-session`) via
`useSyncExternalStore` (SSR-safe; re-renders after hydration if a session exists). `signIn` /
`signUp` write it (any credentials); `signOut` clears it; cross-tab changes sync via `storage`.

**Route gate** — `_app.tsx` redirects to `/sign-in?redirect=<path>` (client-side `useEffect`, since
the mock session is localStorage-only and `beforeLoad` runs on the server too); `SignInForm`
bounces back to `redirect` after login. `/sign-in` itself is outside `_app`, always reachable.

**`lib/api.ts`** — `api.get/post/patch/del` (prefix `VITE_API_URL`, JSON, throw `ApiError`), plus
`crudPersist(resource)` — the `persist` fn for `useCrud`. `ProjectsContent` wires it as the
reference: unset `VITE_API_URL` → no-op, in-memory demo; set it → every mutation hits the API.

**Real backend:** point `VITE_API_URL` at your API and replace the seed reads in each feature's
`*Content.tsx` with `api.get(...)` (or a loader); keep `lib/auth.ts`'s `useSession` / `signIn` /
`signUp` / `signOut` surface, swapping the bodies for real calls.

**Server state (React Query)** — `<QueryClientProvider>` is wired in `__root.tsx` (client from
`lib/query.ts`; devtools mount in dev only). No screen uses it yet — the seed arrays are
synchronous. When a feature goes to the API:

```tsx
const { data = SEED } = useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects") });
// pair invalidation with the mutation: crudPersist + queryClient.invalidateQueries({ queryKey: ["projects"] })
```

## AI (`features/ai/`)

Everything runs **offline on a mock**. `lib/ai.ts` — `streamChat(messages, { config, signal })`
is an `AsyncGenerator<string>`: the `provider === "mock"` branch yields a scripted reply word by
word with small delays; the `else` branch throws with instructions. Swap it for your provider's
SSE stream (or a TanStack Start server route that proxies one). `AiConfig` (provider / model /
key / temperature / system prompt) lives in `localStorage` (`web:ai-config`), edited on
**/ai-settings**.

- **/assistant** — multi-thread chat; conversations persist to `localStorage`
  (`use-conversations.ts` — the swap point for a `/conversations` API), markdown-rendered replies
  (`react-markdown` + `remark-gfm`), `AbortController` stop button. Input is a trimmed
  `@kokonutui/ai-prompt` (`components/kokonutui/ai-prompt.tsx`) with a model picker; `?seed=`
  (from a prompt's **Use** action) auto-sends on open.
- **/prompts** — CRUD over `{{variable}}` templates on the usual `useCrud` + `DataGrid` +
  `CrudDialog` stack; **Use** fills the variables and opens the assistant with the result.

## Styling

- Tailwind v4 via `@tailwindcss/vite` — theme in `src/styles.css`, no `tailwind.config`.
- **Dark mode follows the OS** — `@custom-variant dark (@media (prefers-color-scheme: dark))`;
  dark token values (including `--sidebar`) live in a `@media (prefers-color-scheme: dark)`
  block. No `.dark` class, no toggle.
- `cn()` re-exports the `cn` package (what `shadcn add` expects) from `src/lib/utils.ts`.
- Add components: `pnpm dlx shadcn@latest add <name>` / `@bklit/<name>` / `@kokonutui/<name>`
  (registries in `components.json`).

---

# Development

```sh
mise install                            # node + pnpm (see .mise.toml); or use your own
cp .env.example .env.local              # optional — only VITE_API_URL, defaults to in-memory
pnpm install
pnpm exec playwright install chromium   # once, for e2e
pnpm dev            # http://localhost:5173

pnpm lint           # oxlint
pnpm fmt:check      # oxfmt --check
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest, one-shot   (test:watch, test:cov for coverage)
pnpm test:e2e       # playwright — boots pnpm dev itself
```

**Env** — `VITE_API_URL` (CRUD API base) is optional and validated in `src/env.ts`; unset, the app
runs fully in-memory.
`.github/workflows/web-crud-tanstack-ci.yml` runs lint / fmt:check / typecheck / test / build on push + PR, plus
a separate e2e job.

## Tests

**Units** — `vitest` (jsdom) via `vitest.config.ts`, standalone from `vite.config.ts` (the Nitro /
TanStack Start plugins don't run under test); `src/test/setup.ts` wires `@testing-library/jest-dom`.
Scope is the **logic layer**, not the screens: `lib/format`, `lib/auth`, `features/overview/weekly`
(date bucketing), `crud/use-crud` (optimistic create/update/delete + rollback + Undo, via
`renderHook`). `test:cov` reports v8 coverage over just those `.ts` files (`coverage.include` in
the config); screens are the e2e suite's job. Put `*.test.ts(x)` next to the unit.

**E2E** — `@playwright/test` in `e2e/`, chromium only. `playwright.config.ts` starts `pnpm dev` on
5173 (`reuseExistingServer` off in CI). `fixtures.ts` exports a `test` pre-seeded with the mock
session (via `storageState`) — import from there for "signed-in" specs; `auth.spec.ts` uses the
raw `test` to check the gate. Covers: the auth redirect + return round-trip, shell + sidebar
navigation, `/sign-in` outside the shell, and a create→delete CRUD round-trip on `/projects`.
Needs `pnpm exec playwright install chromium` first (`--with-deps` on CI).

_No pre-commit hooks_ — this package sits in a pnpm monorepo where git hooks live at the repo
root; CI is the gate. Run `pnpm lint && pnpm fmt:check && pnpm typecheck` before pushing.

---

# Build & deploy

```sh
pnpm build          # vite build → .output/ (Nitro node-server)
pnpm start          # node .output/server/index.mjs  (honours PORT)
```

Baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, HSTS) ship on every response via Nitro `routeRules` in `vite.config.ts` —
add a tuned `Content-Security-Policy` there once you've inventoried the app's inline scripts.

**Docker** — multi-stage `Dockerfile`; the runtime image is just `node:24-alpine` + `.output`
(Nitro bundles its own deps), listening on `PORT` (default 3000):

```sh
docker build -t web-crud-tanstack . && docker run -p 3000:3000 web-crud-tanstack
```

For host presets (Vercel, Netlify, Cloudflare, Lambda) see https://nitro.build/deploy and set
the adapter in `vite.config.ts`.

---

# License

MIT — see [LICENSE](./LICENSE).

---

# Adding a resource

1. `src/features/<group>/data/<resource>.ts` — export the type + a `SEED` array.
2. `src/features/<group>/<Resource>Content.tsx` — copy an existing `*Content.tsx` from that
   feature; adjust the columns, the `<StatRow>` metrics, and the `zod` `schema` that drives
   the `<XForm>` fields. (New group → new `src/features/<group>/` folder.)
3. `src/routes/_app/<resource>.tsx` — `createFileRoute("/_app/<resource>")({ head, component })`,
   importing from `#/features/<group>/<Resource>Content`.
4. Add it to a group in `GROUPS` (or `PINNED`) in `src/components/app-sidebar.tsx` (and `TITLES` in `_app.tsx`).
   Add a new `{ label, items }` entry for a new group.
