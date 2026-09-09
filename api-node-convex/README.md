# api-node-convex

A backend template on [Convex](https://convex.dev) — the same CRUD problem as `api-node-hono`,
done the Convex way: no server to run, no SQL, no migrations. You write typed functions;
Convex is the database, the runtime, and (via `http.ts`) the HTTP API.

## Quick start

```sh
pnpm install
pnpm dlx convex dev        # logs in, creates a dev deployment, writes _generated/, watches

# set deployment config (not .env — these are read as process.env.NAME in functions)
pnpm dlx convex env set CLERK_JWT_ISSUER_DOMAIN https://<subdomain>.clerk.accounts.dev
pnpm dlx convex env set CLERK_WEBHOOK_SECRET    whsec_...        # Clerk dashboard → Webhooks
pnpm dlx convex env set MISTRAL_API_KEY         <key>            # only for features/assistant
pnpm dlx convex env set OUTBOUND_WEBHOOK_URL    https://...      # optional; unset = deliveries skipped
```

| Command          | Does                                          |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | `convex dev` — watch, push, regenerate        |
| `pnpm deploy`    | `convex deploy` — push to production          |
| `pnpm codegen`   | regenerate `_generated/` only                 |
| `pnpm test`      | `convex-test` + vitest — no deployment needed |
| `pnpm typecheck` | `tsc --noEmit`                                |
| `pnpm lint`      | oxlint (+ Convex rules, see below)            |
| `pnpm fmt`       | oxfmt                                         |

## Layout

```
convex/
├── features/                    # business modules
│   ├── sales/
│   │   ├── tables.ts            # customers, products, invoices, orders — schema fragment
│   │   ├── model.ts             # order pricing + detail-read expansion (plain TS over ctx)
│   │   ├── aggregates.ts        # order count/revenue tree, namespaced by owner
│   │   ├── customers.ts         → api.features.sales.customers.*  (simplest module — copy it)
│   │   ├── products.ts / invoices.ts / orders.ts
│   │   └── sales.test.ts
│   ├── workspace/{tables.ts, projects.ts, workspace.test.ts}
│   ├── support/{tables.ts, tickets.ts, support.test.ts}
│   └── assistant/{model.ts, agent.ts, threads.ts, messages.ts, assistant.test.ts}
├── infrastructure/              # cross-cutting concerns
│   ├── identity/                # auth.ts (requireUserId/Writer/Uploader), users mirror, tables
│   ├── storage/                 # files.ts over Convex `_storage`, tables
│   ├── jobs/                    # webhooks.ts (workpool + retries), migrations.ts (backfills)
│   ├── replication/             # offline-sync (RxDB) pull/push for the flat resources + tombstones
│   └── lib/                     # helpers that register NO Convex functions
│       ├── db.ts                # requireOwned(ctx, table, id, ownerId) + list limits
│       ├── errors.ts            # ConvexError codes → HTTP status
│       ├── limits.ts            # named rate limits (writes, uploads, ai)
│       └── rest.ts              # HTTP helpers: authed(), json(), mountResource, mountReplication
│
│   # ── Convex fixes the location of everything below ──
├── schema.ts                    # composes the per-folder tables.ts fragments
├── http.ts                      # REST surface — route wiring only
├── crons.ts                     # scheduled jobs (daily unclaimed-upload sweep)
├── auth.config.ts               # trusted JWT issuer (Clerk)
├── convex.config.ts             # components installed into this deployment
└── _generated/                  # codegen — COMMITTED, so the project typechecks without a login

test/{harness.ts, vite-env.d.ts} # convex-test setup: module glob, asUser(), error assertions
```

Convex maps folders to API namespaces: `convex/features/sales/customers.ts` is
`api.features.sales.customers.list`.

**Conventions**

- `features/` = business modules, `infrastructure/` = cross-cutting. `lib/` is the one folder
  that registers no `query`/`mutation`/`action` — nothing there shows up in `api`/`internal`.
- Thin function wrappers; real logic goes in a plain-TS `model.ts` (only `sales` needs one).
- Schema is declared per folder as a `tables.ts` fragment; `schema.ts` just spreads them.
  Convex forces the final `defineSchema` to live at `convex/schema.ts`.
- Fixed locations you can't move: `schema.ts`, `http.ts`, `crons.ts`, `auth.config.ts`,
  `_generated/`.
- `test/` sits outside `convex/` because everything under `convex/` is analysed and bundled
  for deployment, and the harness imports `convex-test` (a devDependency).
- Imports are aliased so no path starts with `../`: `@/x` = `convex/x`, `@test/x` = `test/x`.
  Only same-folder siblings stay relative. The mapping is declared in `tsconfig.json`,
  `convex/tsconfig.json`, and `vitest.config.ts` (three tools resolve it independently).
- `_generated/` is checked in on purpose and lists every module under `convex/` — re-run
  `pnpm dlx convex dev` / `convex codegen` after adding a file.

## Functions

All from `@/_generated/server`. `internal*` variants are identical but unreachable from clients.

|            | reads DB           | writes DB             | side effects (fetch) | transactional |
| ---------- | ------------------ | --------------------- | -------------------- | ------------- |
| `query`    | ✅                 | ✕                     | ✕                    | —             |
| `mutation` | ✅                 | ✅                    | ✕                    | ✅ (handler)  |
| `action`   | via `ctx.runQuery` | via `ctx.runMutation` | ✅                   | ✕             |

**Validators are derived, not retyped.** Every function declares both `args` and `returns`.
Each module builds them from its table so a new column flows through with no edit elsewhere:

```ts
const writable = salesTables.customers.validator.omit("ownerId"); // client-settable fields
const doc = schema.doc("customers"); // fields + _id + _creationTime

export const create = mutation({ args: writable.fields, returns: doc /* … */ });
export const update = mutation({ args: { id: v.id("customers"), ...writable.partial().fields } /* … */ });
```

`ownerId` is structurally impossible to accept from a client. `ctx.db` calls pass the table
name explicitly — `ctx.db.get("customers", id)`.

**Errors.** Expected failures throw a `ConvexError` with a `code` (`infrastructure/lib/errors.ts`) —
production redacts plain `Error` messages, a `ConvexError`'s `data` survives. `rest.ts` maps
the code to a status:

| code               | HTTP | meaning                                              |
| ------------------ | ---- | ---------------------------------------------------- |
| `UNAUTHENTICATED`  | 401  | no verified identity                                 |
| `FORBIDDEN`        | 403  | authenticated but not allowed                        |
| `NOT_FOUND`        | 404  | absent, or owned by someone else (deliberately same) |
| `INVALID_ARGUMENT` | 400  | well-formed request, unusable values                 |
| `CONFLICT`         | 409  | collides with existing state                         |
| `RATE_LIMITED`     | 429  | budget spent; carries `retryAfterMs`                 |

Reads that can legitimately be empty return `null` instead of throwing (`customers.get`).

## Resources

Every business table carries `ownerId` (the Clerk `sub`) + a `by_ownerId` index; every
function starts with `requireUserId(ctx)` and scopes to it. Money is integer cents,
timestamps epoch millis.

| Module                         | Shape                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| `features/sales/customers`     | name, email, company?, plan, status — flat, copy this one  |
| `features/sales/products`      | name, sku, priceCents, active — flat                       |
| `features/workspace/projects`  | name, status, startedAt? — flat                            |
| `features/support/tickets`     | subject, body, priority, status, assignee? — flat          |
| `features/sales/invoices`      | → customerId, number, amountCents, status, dueAt?          |
| `features/sales/orders`        | → customerId, lineItems[] (→ products), totalCents, status |
| `infrastructure/storage/files` | → storageId (`_storage`), name                             |

All seven expose `list` (newest first, default 50 / max 200), `paginated` (cursor-based),
`get` and `remove`; `orders` adds `stats` (see Aggregates). `files` is the exception on
writes — `save` instead of `create`, and no `update` — because an upload isn't a JSON body.

- Reads call `requireUserId(ctx)`; writes call `requireWriter(ctx)` (same check + a rate-limit
  token); uploads call `requireUploader(ctx)` (tighter bucket).
- `invoices.create` and `orders.create` verify the referenced customer is yours; `orders`
  checks every product too, snapshots each unit price server-side so a client can't invent
  totals, and freezes line items once placed (only `status` transitions).
- Cross-resource filters use an owner-scoped compound index
  (`by_ownerId_and_customerId`), so `invoices.list({ customerId })` with someone else's
  customer returns an empty page rather than revealing it exists.
- The four flat resources (`customers`, `products`, `projects`, `tickets`) also carry
  `clientId` + `updatedAt` and expose `pull` / `push` for offline sync — see
  [Offline replication](#offline-replication-rxdb). `create` accepts an optional client-minted
  `clientId`; omit it and the server generates one.
- `files`: two upload paths, both ending in `save` — `generateUploadUrl` (browser: get a URL,
  POST the bytes, then claim the `storageId`) and the one-shot `POST /files`. `contentType` /
  `size` are read back from `_storage`, never stored; a `by_storageId` index enforces one
  owner per blob (a second claim gets a `409`); reads add a download `url`. Those URLs are
  unauthenticated bearer credentials — anyone holding one can fetch the bytes, and the only
  way to revoke one is to delete the blob. Bytes that arrive and are never claimed are
  deleted a day later by the cron — see Scheduled work.

**Adding a resource:** add the table (with a `by_ownerId` index) to its feature's `tables.ts`,
copy `features/sales/customers.ts`, run `pnpm dlx convex dev`, wire it into `http.ts` with
`mountResource`.

The flat modules are near-identical on purpose — a generic CRUD factory fights Convex's
function-builder types. If you want the boilerplate gone,
[`convex-helpers`](https://github.com/get-convex/convex-helpers)' `crud` does it.

## HTTP API (`http.ts`)

Deployed at `https://<deployment>.convex.site`. Send `Authorization: Bearer <Clerk JWT>`.
Convex clients call functions directly instead (and get live subscriptions) — this surface is
for non-Convex, server-to-server callers, and sets **no CORS headers**.

HTTP actions have no built-in arg validation, so `rest.ts` wraps every handler and turns a bad
request into a 4xx instead of a 500.

The six CRUD resources are one line each via `mountResource(http, path, refs)`:

```
GET  /x?limit=&cursor=   → paginated, always { items, continueCursor, isDone }
POST /x                  → create (201)
GET  /x/{id}             → get (404 if absent)
PATCH /x/{id}            → update
DELETE /x/{id}           → remove (204)
```

Hand-wired routes:

- `GET /orders/stats?since=<ms>` → `{ count, totalCents }`. Registered as an exact path so it
  wins over the `/orders/{id}` prefix.
- `/threads` — `POST` `{ title? }` → `{ threadId }`, `GET ?limit=&cursor=`,
  `DELETE /threads/{id}` (204), `POST /threads/{id}/messages` `{ prompt }` → `{ text }`,
  `GET /threads/{id}/messages`. See Assistant.
- `/files` — `POST /files?name=` with raw bytes + `Content-Type` → `ctx.storage.store` then
  `files.save` (201); `GET /files?limit=&cursor=`, `GET /files/{id}`, `DELETE /files/{id}`
  behave like any other collection.
- `GET /x/pull?updatedAt=&clientId=&limit=` and `POST /x/push` on `customers`, `products`,
  `projects`, `tickets` — offline sync, via `mountReplication`. Exact paths, so they win over
  `/x/{id}`. See [Offline replication](#offline-replication-rxdb).
- `POST /webhooks/clerk` — Svix-signature-verified (not Bearer-authed); keeps `users` in sync.

Writes past the per-caller budget answer `429` with a `Retry-After` header.

## Auth — Clerk

`auth.config.ts` lists the trusted JWT issuer; Convex verifies tokens against its JWKS itself,
**no server SDK**. Setup:

1. Enable the **Convex integration** in the Clerk dashboard (issues tokens with `aud: "convex"`).
2. `pnpm dlx convex env set CLERK_JWT_ISSUER_DOMAIN https://<subdomain>.clerk.accounts.dev`

In any function, `await ctx.auth.getUserIdentity()` returns the verified claims (`.subject` is
the user id) or `null`, and propagates through `ctx.runQuery` / `ctx.runMutation`. Scope by
`subject`, never by an email argument. Swap Clerk for Auth0 / Convex Auth by editing
`auth.config.ts` only. Tests fake the caller with `t.withIdentity({ subject: "user_x" })`.

**Users table.** Clerk stays the source of truth; a `users` table mirrors it for joins and
profile data, kept current by `POST /webhooks/clerk` (`user.created/updated/deleted`) — point
a Clerk webhook at `https://<deployment>.convex.site/webhooks/clerk`. `users.current` returns
the caller's row; the sync mutations are `internal`. There is deliberately **no `users.list`**
and **no roles / orgs / sharing** — authorization is single-owner throughout. Add Clerk
Organizations or a `memberships` table if you need more.

## Components

First-party [Convex components](https://www.convex.dev/components) are sandboxed mini-backends
with their own tables. Five are installed in `convex.config.ts`:

| Component                  | Used by                             | For                                      |
| -------------------------- | ----------------------------------- | ---------------------------------------- |
| `@convex-dev/agent`        | `features/assistant/`               | threads, message history, LLM calls      |
| `@convex-dev/rate-limiter` | `infrastructure/lib/limits.ts`      | per-caller write / upload / AI budgets   |
| `@convex-dev/workpool`     | `infrastructure/jobs/webhooks.ts`   | queued outbound delivery with retries    |
| `@convex-dev/aggregate`    | `features/sales/aggregates.ts`      | order count/revenue without a table scan |
| `@convex-dev/migrations`   | `infrastructure/jobs/migrations.ts` | online data backfills                    |

Adding one is three steps: `app.use(...)` in `convex.config.ts` (with a `name` for multiple
instances), `pnpm dlx convex dev` to regenerate the `components.<name>` bindings (**commit
them**), and registration in `test/harness.ts` or every function touching `components.*` fails.

Not installed: `@convex-dev/better-auth` (a Clerk _replacement_, not an addition).

### Rate limiting

Convex has nothing built in. `infrastructure/lib/limits.ts` defines named token buckets over
`@convex-dev/rate-limiter`, keyed by caller id:

| Limit     | Budget            | Applies to                |
| --------- | ----------------- | ------------------------- |
| `writes`  | 120/min, burst 40 | every mutation            |
| `uploads` | 20/min, burst 5   | `files.save` (both paths) |
| `ai`      | 10/min, burst 3   | `assistant.messages.ask`  |

The check lives in the mutation, not at the HTTP edge — so Convex clients are covered too, and
the spend is transactional (tokens return if the mutation throws). It's wired into
`requireWriter` / `requireUploader` so a new mutation can't silently skip it.

### Aggregates

Convex has no `COUNT(*)` / `SUM(...)`, and `collect().length` reads every row.
`features/sales/aggregates.ts` keeps a balanced tree instead, so `orders.stats` answers
count + revenue in O(log n). It's namespaced by `ownerId` (privacy, and no single root
document to contend on) and keyed by `_creationTime` (so `?since=` is a bounded query).

The cost: it's denormalised state. Every insert / update / delete in `orders.ts` calls
`orderTotals.insert` / `.replace` / `.delete` in the **same mutation**, or the totals drift.

### Background work

`infrastructure/jobs/webhooks.ts` POSTs to `OUTBOUND_WEBHOOK_URL` when an invoice becomes
paid — the template's only `action`, and the shape for any "data changed, go tell someone"
job. The mutation commits first and only _enqueues_ the delivery (inside its transaction, so a
throw sends nothing); the action does the non-transactional `fetch`.

The workpool adds bounded concurrency (`maxParallelism: 5`), retries with backoff
(`maxAttempts: 4`), and an `onComplete` that fires even after the last retry — the only place
a permanent failure is visible. Retries are only safe for idempotent work: this delivery
sends an `Idempotency-Key` naming the _state transition_ (`invoice.paid:<id>`). Work that
can't offer that (sending email, charging a card without a transaction id) must enqueue with
`retry: false`. That's the event-driven half; the clock-driven half is Scheduled work below.

### Migrations

`infrastructure/jobs/migrations.ts` uses `@convex-dev/migrations`. These are **not** per-change
SQL migration files — Convex pushes schema edits straight to the deployment. What it blocks is
data drifting from the schema, i.e. adding a **required** field or **removing** a field. Both
take five steps: widen the schema (new field optional, or keep the doomed one optional), push,
run a migration to fix the data, narrow the schema, push again.

```sh
M=infrastructure/jobs/migrations
pnpm dlx convex run $M:normalizeCustomerEmails '{dryRun: true}'   # one batch, then throw
pnpm dlx convex run $M:normalizeCustomerEmails                    # for real
pnpm dlx convex run $M:runAll --prod                              # the whole list, in order
pnpm dlx convex run --component migrations lib:getStatus --watch  # live progress
```

`runAll` skips completed migrations, so it's safe on every deploy:
`pnpm dlx convex deploy && pnpm dlx convex run $M:runAll --prod`. The recorded name is the
function path, so moving this module makes an already-completed migration run again under its
new name — harmless for an idempotent backfill, worth knowing for a destructive one.

### Assistant

`@convex-dev/agent` owns the thread and message tables (nothing added to `schema.ts`).
`features/assistant/` is the app-side wrapper: auth (threads keyed by the Clerk `sub`), the
rate-limit reservation, and the HTTP routes. The model is Mistral (`mistral-small-latest`) via
the AI SDK, isolated in `model.ts` so tests stub it — the key is read from the **deployment**
env at request time (`pnpm dlx convex env set MISTRAL_API_KEY <key>`), and the first `ask`
throws if it's missing. `ask` authorizes, spends an `ai` token, then `generateText`s. For a
chat UI, swap to `assistant.streamText` and subscribe to `messages.list`.

## Scheduled work (`crons.ts`)

Crons are built into Convex — no component, no dashboard. The schedule lives in
`convex/crons.ts` and ships with the code, so pushing the file _is_ installing the job.

```ts
crons.cron(
  "sweep unclaimed uploads",
  "17 3 * * *", // 03:17 UTC — not minute :00, see below
  internal.infrastructure.storage.files.sweepUnclaimedUploads,
  { graceMs: DAY_MS },
);
```

Three constraints. **`interval` / `cron` only** — the `hourly` / `daily` / `weekly` helpers
are out (`_generated/ai/guidelines.md`). **Only `internal*` functions**: a cron has no caller,
so there's no identity to authorize, and scheduling a public function would publish an entry
point that skips every check in `identity/auth.ts`. **Not on the hour**: minute `:00` is when
every cron on every deployment fires, so work scheduled there queues behind the crowd — the
`no-top-of-hour-crons` lint rule flags it.

The one job here earns its place. `generateUploadUrl` has to hand out a URL before any row
points at it, so a client that uploads and never calls `save` leaves bytes in `_storage` that
nothing references, no query can see, and Convex won't collect — they just accrue cost.
`sweepUnclaimedUploads` deletes blobs older than `graceMs` with no `files` row, the grace
window being what keeps an upload still travelling toward its `save` untouched. It works in
batches of 200 and returns `{ scanned, deleted }`, so `scanned === 200` in the logs is the
signal that a backlog needs more than one nightly pass.

Pick by trigger: a cron when it's the clock, the workpool when a write caused it, and
`ctx.scheduler.runAfter` from inside a mutation for one-shot delayed work (per item,
transactional, no schedule to maintain).

## Offline replication (RxDB)

`infrastructure/replication/` is the server half of an offline-sync client — an
[RxDB](https://rxdb.info) replication endpoint, though nothing here is RxDB-specific. A browser
keeps a local IndexedDB copy of the caller's rows, reads and writes it offline, and
reconciles on reconnect. Wired for the four flat resources; `customers.pull` / `customers.push`
are the reference pair, `mountReplication` puts them on HTTP.

**Two extra columns**, `...replicatedFields` from `replication/tables.ts`:

- `clientId` — a stable id the client mints _before_ the row reaches the server, so an offline
  insert has an identity to sync under. It's the RxDB primary key; Convex's `_id` is
  server-only. `create` takes an optional `clientId`; a plain REST call omits it and the
  server generates one.
- `updatedAt` — epoch millis, bumped on every write (`stampCreate` / `stampUpdate`). `pull`
  orders by it; `push` resolves conflicts by it.

**`pull({ checkpoint, limit })` → `{ documents, checkpoint }`.** Everything changed at or
after the checkpoint — live rows as `{ ...doc, _deleted: false }`, deletes as
`{ clientId, updatedAt, _deleted: true }` — ordered by `(updatedAt, clientId)`, capped at
`limit`. Hand the returned checkpoint back for the next page; at a few hundred rows the first
call gets everything.

**`push({ changeRows })` → `[]`.** New `clientId` inserts, known `clientId` patches, `_deleted`
drops the row. Conflicts are **last-write-wins on `updatedAt`**: `push` never returns a
conflict row — if the server's copy is newer it keeps it and the client re-pulls it next
cycle. Enough for single-owner data. Concurrent multi-device edits to the same row would
instead compare `assumedMasterState`, return the current server state, and merge it in a
client-side `conflictHandler`.

**Deletes are tombstoned.** A hard `DELETE` is invisible to a client that was offline when it
happened — on reconnect it re-pushes its stale copy and resurrects the row. So `remove` writes
a row to the `tombstones` table (keyed by `clientId`), and `pull` replays it. Tombstones
accrue forever; a real deployment prunes ones older than its longest offline window with a
cron over `by_ownerId_and_table_and_updatedAt`.

**`invoices` and `orders` are not replicated.** Both hold foreign keys to rows that might only
exist on the client (an invoice for an offline-created customer), and `orders` totals are
computed server-side on purpose (`priceOrder`) — offline creation would let a client set its
own. Replicating them means referencing parents by `clientId` and deciding trust-vs-recompute
for derived values, which is app-specific. To add it: give those tables `...replicatedFields`
plus a `customerClientId`, resolve it to a real `_id` in `push`, and either trust the client's
`totalCents` or re-run `priceOrder` on the server (totals then shift if a price changed while
the client was offline).

## Convex lint rules, without ESLint

`@convex-dev/eslint-plugin` catches Convex-specific mistakes oxlint has no rules for. It runs
as an **oxlint JS plugin** (`.oxlintrc.json` → `jsPlugins`, scoped to `convex/**/*.ts`), not
under ESLint — `@typescript-eslint/parser` hard-throws on this template's TypeScript version
([issue](https://github.com/typescript-eslint/typescript-eslint/issues/10940)), and oxlint
parses TS natively. Cost is ~1.2s per run for the JS bridge.

Caveats: rule names come from the plugin, not its docs table (`require-args-validator`, not
`require-argument-validators`). `explicit-table-ids` and `no-collect-in-query` fire
heuristically without type info (no autofix, false positives possible — silence with
`// eslint-disable-next-line @convex-dev/<rule>`, or use the type-aware codemod
`pnpm dlx @convex-dev/codemod explicit-ids`). oxlint's `jsPlugins` is alpha — if it breaks,
drop the `overrides` block and nothing else depends on it.

## Tests

`convex-test` runs functions against a JS mock of the Convex runtime — no real backend, under
`environment: "edge-runtime"`. `test/harness.ts` holds the shared setup: `setup()` (anonymous),
`asUser(subject)`, plus `rejectionCode` / `errorOf` for asserting on error **codes** rather
than message text. `t.query` / `t.mutation` / `t.run` exercise functions; `t.fetch` exercises
`http.ts`.

Gotchas: each component must be registered with `convex-test` under the same name used in
`convex.config.ts` (`setup()` does this). The module glob is
`["/convex/**/*.ts", "!/convex/**/*.test.ts"]` — the extglob form from the Convex docs matches
nothing under this Vite version, and `_generated/*.d.ts` has to stay included because that
directory is how `convex-test` locates the module root. `convex-test`'s `_storage` stand-in
doesn't record `contentType`, so it always reads back `null` in tests.

## Deploy

`pnpm dlx convex deploy` — Convex hosts the datastore, functions, and HTTP endpoints. Set
config with `pnpm dlx convex env set NAME value` (read as `process.env.NAME`), not via `.env`.
Self-hosting (docker, Postgres/MySQL-backed) is also supported — see
[the guide](https://docs.convex.dev/self-hosting).
