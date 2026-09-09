# api-node-hono

A production-oriented Hono API template focused on clean boundaries, explicit infrastructure, and testability.

The goal is to provide a simple foundation that can grow without unnecessary complexity. It ships a
`widgets` CRUD reference resource and a document-grounded RAG feature (PDF OCR → chunks → retrieval →
grounded chat) as worked examples.

---

# Architecture

The project follows a modular architecture with clear boundaries:

```
src/
├── db/
├── features/
├── helpers/
├── infrastructure/
├── lib/
├── middleware/
├── env.ts
├── index.ts
└── server.ts
```

## Folder Responsibilities

### `db/`

Contains database schema definitions.

Responsibilities:

- Drizzle schema definitions
- Database table structures
- Database types

---

### `infrastructure/`

Contains external integrations and resources.

Example:

```
src/infrastructure/
├── auth/     # Auth providers — better-auth.ts (self-hosted) | clerk.ts (hosted)
├── db/       # Database clients and ORM configuration (Drizzle + PostgreSQL)
├── email/    # Email providers and delivery services (Emailit, etc.)
├── storage/  # Object storage for uploads — s3 | memory (STORAGE_PROVIDER)
└── mistral.ts # Mistral over fetch — embeddings, chat completion, PDF OCR
```

Responsibilities:

- Authentication providers
- Database clients
- Email providers
- Object storage
- External APIs
- Third-party services

Application code depends on infrastructure modules instead of creating external clients directly.

Example:

```ts
import { auth } from "@/infrastructure/auth";
```

This allows tests to replace production implementations with fixtures.

---

### `middleware/`

Contains reusable HTTP concerns.

Example:

```
src/middleware/
├── auth.ts     # requireVerifiedApiKey — validates the key, sets `userId` on the context
├── errors.ts   # ApiError + the notFound / onError handlers (the `{ code, message }` shape)
└── logger.ts   # one structured line per request, honours LOG_LEVEL
```

Responsibilities:

- Authentication
- Authorization
- Error handling
- Request lifecycle logic

---

### `features/`

Contains business functionality.

Each feature owns its:

- Routes
- Handlers
- Services
- Domain logic

```
features/
├── widgets/          # CRUD reference resource
│   ├── routes.ts     #   OpenAPI route defs + handlers
│   ├── service.ts    #   DB access, owner-scoped
│   └── widgets.test.ts
├── rag/              # PDF ingest → chunk → embed → retrieve
│   ├── routes.ts     #   /ingest, /retrieval, /chat, /documents
│   ├── chunk.ts      #   OCR blocks → chunks with page boxes
│   └── store.ts      #   rag_documents + rag_chunks (pgvector), cosine ranking in-DB
└── chat/
    └── prompt.ts     #   grounds the model on retrieved chunks
```

`widgets/` is the **CRUD reference** — full CRUD, every row scoped to the caller's
`userId`, a paginated list (`?limit=&offset=&order=&sort=`), normalised `404` / `422`.
Copy it for a new resource; add the table under `db/schema/`.

Feature table types live with the schema in `db/schema/`, not in the feature — the
Better Auth adapter and Drizzle migrations both read `db/schema`.

Features should not create infrastructure clients directly.

---

### `lib/`

Cross-cutting helpers that are not infrastructure and not tied to one feature.

```
src/lib/
├── app.ts    # createApp() — OpenAPIHono pre-wired with the validation-error hook; AppEnv type
└── query.ts  # listQuery params + page() response envelope
```

---

### `helpers/`

Contains testing utilities.

Structure:

```
helpers/
└── test/
    ├── better-auth.ts
    └── pglite.ts
```

Responsibilities:

- Test database reset/migration
- Authentication test helpers (real signups, not mocks)

---

# Application Entry Point

This is a Node process (`@hono/node-server` + `tsx`), not a Cloudflare worker.

`src/index.ts` composes the application. Tests import it and call `app.request` — they never listen.

Responsibilities:

- Create Hono instance
- Register global middleware
- Register routes
- Configure authentication
- Configure error handling

The entry point should only compose the application and avoid business logic.

`src/server.ts` is the process: load `.env`, build `bindings()`, listen on `PORT` (default `3000`).

`@/` maps to `src/` (`tsconfig` + Vitest + `alias-hook.mjs` for `tsx`).

Request flow:

```
Request
    |
    v
Global Middleware
    |
    v
Public Routes
    |
    v
Protected Middleware
    |
    v
Feature Routes
    |
    v
Error Handler
```

---

# API Documentation

Routes registered with `.openapi()` (via `OpenAPIHono`) generate an OpenAPI spec automatically — no hand-written docs to keep in sync.

- `GET /doc` — the merged OpenAPI JSON (app routes + Better Auth's routes, see `src/infrastructure/openapi.ts`)
- `GET /docs` — Swagger UI, reading from `/doc`

---

# Authentication

`AUTH_PROVIDER` selects the provider (same seam as `DB_PROVIDER` / `STORAGE_PROVIDER`).
Either way, `src/middleware/auth.ts` gates `/api/v1/*` and sets `c.get("userId")` — the
owning user — for handlers to scope their queries by. Feature code doesn't care which
provider is active.

## `better-auth` (default) — self-hosted

`src/infrastructure/auth/better-auth.ts`: email/password, email verification, API-key
issuance, Drizzle adapter (tables in `db/schema/auth/`). The gate reads an `X-API-Key`
header → the key's owning user → requires a verified email → `userId`.

```
X-API-Key  →  verify key  →  find owning user  →  email verified?  →  userId
```

`/api/auth/*` is Better Auth's own router (sign-up, sign-in, verification, key management).

## `clerk` — hosted

`src/infrastructure/auth/clerk.ts`: `@clerk/backend`. Clerk's frontend SDK mints tokens and
talks to Clerk directly, so there are **no routes to mount**. The gate calls
`clerkClient.authenticateRequest(req, { acceptsToken: ["session_token", "api_key"] })` on the
`Authorization: Bearer` header — a Clerk session JWT **or** a Clerk API key — and takes
`userId` from the token (its `subject` for an org-owned API key). Needs `CLERK_SECRET_KEY`
and `CLERK_PUBLISHABLE_KEY`. Under Clerk, `/api/auth/*` 404s and the Better Auth OpenAPI
merge is skipped.

## Both

`GET /api/auth/session` returns `{ userId }` for the verified caller regardless of provider.

Tests: the Better Auth path runs real sign-ups against pglite (`helpers/test/better-auth.ts`);
the Clerk path mocks `@clerk/backend` (`middleware/clerk-auth.test.ts`) — it's a hosted
service, nothing to run locally.

---

# Health & readiness

- `GET /healthz` — liveness. Always `200 { ok: true }` while the process is up.
- `GET /readyz` — readiness. Runs `select 1`; `200 { ok: true }` or `503 { ok: false }`
  when the database is unreachable. Point the load balancer / k8s probe here.

---

# Observability

- `requestId()` assigns each request an id and echoes it as `X-Request-Id`; it also
  appears in every error body (`requestId`) and in the request log line.
- `src/middleware/logger.ts` logs one line per request (`method path status ms id`).
  `LOG_LEVEL=silent` disables it — swap `console.log` for a structured logger there.
- `bodyLimit` rejects request bodies over 25 MB with `413 payload_too_large` (sized for
  PDF uploads to `/api/v1/ingest`; JSON endpoints are far smaller).

---

# RAG & chat (`features/rag`, `features/chat`)

A document-grounded question-answering feature, all under `/api/v1/*` (verified API key,
owner-scoped by `userId`). Mistral does the heavy lifting via plain `fetch` in
`infrastructure/mistral.ts` — no SDK.

| Route                                                                              | Does                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/ingest`                                                              | multipart PDF → Mistral OCR → `chunk.ts` merges boxes into ~32-token chunks → PDF stored via `storage`, chunks embedded and written to `rag_chunks`. Returns `{ documentId, chunkCount, pages }`. |
| `POST /api/v1/retrieval`                                                           | `{ question, top_k? }` → embed the question, rank the owner's chunks by cosine similarity, return the top _k_ with `[page,left,right,top,bottom]` boxes.                                          |
| `POST /api/v1/chat`                                                                | retrieval + `complete()` grounded on those chunks. `422 no_index` if nothing is ingested yet.                                                                                                     |
| `GET /api/v1/documents` · `GET/DELETE /documents/{id}` · `GET /documents/{id}/pdf` | list / inspect / delete (chunks cascade, blob purged) / redirect to a short-lived storage URL.                                                                                                    |

**Embeddings use a real pgvector `vector(1024)` column** (`rag_chunks.embedding`), ranked in
the database with the `<=>` cosine operator (`cosineDistance` in `store.ts`), behind an HNSW
index. Neon ships pgvector; the pglite test client loads it via `@electric-sql/pglite-pgvector`
(`infrastructure/db/pglite.ts`), and the migration runs `CREATE EXTENSION IF NOT EXISTS vector`.
`mistral-embed` sets the width — change `EMBED_DIM` in `db/schema/rag.ts` if you swap models.

**Object storage** (`infrastructure/storage/`) follows the provider-swap pattern: `memory`
(default in tests and offline dev — process-local, `data:` URLs) or `s3` (any S3-compatible
store; set `S3_ENDPOINT` for R2 / MinIO). The AWS SDK (`@aws-sdk/client-s3`,
`@aws-sdk/s3-request-presigner`) is in `package.json`.

---

# Database

The project uses:

- Drizzle ORM
- PostgreSQL
- Better Auth Drizzle adapter

Database client configuration lives in:

```
src/infrastructure/db/neon.ts    # production — Neon over HTTP
src/infrastructure/db/pglite.ts  # tests — in-memory Postgres
```

`src/infrastructure/db/index.ts` picks between them based on the `DB_PROVIDER` binding (defaults to `neon`). The same pattern is used for `infrastructure/auth` (`AUTH_PROVIDER`), `infrastructure/email` (`EMAIL_PROVIDER`) and `infrastructure/storage` (`STORAGE_PROVIDER`).

Schema definitions live in `src/db/schema/` — `auth/` (Better Auth tables), `widgets.ts`
(CRUD reference), `rag.ts` (`rag_documents` + `rag_chunks`, chunks cascade on document
delete). `drizzle-kit generate` after any change; migrations in `drizzle/` are applied by
`db:migrate` (prod) and re-run against pglite on every test (`helpers/test/pglite.ts`).

neon-http has no interactive transactions — `store.ts` `ingestDocument` rolls back its
document row by hand on a chunk-insert failure rather than wrapping the two in `tx`.

---

# Middleware

## Authentication Middleware

`requireAuth` dispatches on `AUTH_PROVIDER`:

- `requireVerifiedApiKey` (better-auth) — `X-API-Key` → validate → owning user → email verified → `userId`.
- `requireClerkAuth` (clerk) — `Authorization: Bearer` → `authenticateRequest` (session JWT or API key) → `userId`.

See the Authentication section above.

---

## Error Middleware

`src/middleware/errors.ts`

Responsibilities:

- Handle Hono exceptions
- Return one consistent error shape
- Prevent leaking internal details

Every failure — thrown `ApiError`, `HTTPException`, request-validation failure, or an
uncaught throw — serialises to the same body:

```json
{
  "code": "validation_error",
  "message": "Request validation failed",
  "details": [{ "path": "name", "message": "Expected string, received number" }],
  "requestId": "b3f1c2d4"
}
```

- `code` — stable machine string (`not_found`, `unauthorized`, `rate_limited`, …). Match on this, not `message`.
- `message` — human-readable; safe to show. Sanitised to `"Internal Server Error"` for any 5xx.
- `details` — present only for `validation_error` (one entry per failed field).
- `requestId` — the `X-Request-Id` for that request, for log correlation.

Handlers raise errors with `throw new ApiError(404, "not_found", "Widget not found")`.
Failed `request` schema checks are turned into `422 validation_error` by the shared
`defaultHook` in `lib/app.ts`.

Internal details (DB errors, stack traces, secrets, internal URLs) are logged
server-side only, never sent to the client.

---

# Testing Strategy

Tests focus on real application behavior while replacing external boundaries.

Production:

```
Application
    |
    v
Infrastructure
    |
    v
External Services
```

Tests:

```
Application
    |
    v
Test Fixtures
    |
    v
Local Test Environment
```

---

## Test Helpers

Test helpers replace external services, not application code — no `vi.mock`.

```
src/helpers/test/
├── better-auth.ts # makeUser, makeKey — real signups against Better Auth + pglite
└── pglite.ts      # resetDatabase — drops and re-migrates the in-memory Postgres schema
```

`DB_PROVIDER=pglite` (set in `.env.test`) makes `infrastructure/db` resolve to the pglite client automatically, so tests exercise the real Drizzle adapter and real Better Auth flows against a real (in-memory) database.

This allows testing real authentication flows without external services.

---

# Database Testing

Tests use an isolated database environment.

Typical flow:

```
Before test
    |
    v
Reset database
    |
    v
Run migrations
    |
    v
Execute test
```

Benefits:

- Deterministic tests
- No shared state
- Real database behavior

---

# Deployment

`Dockerfile` is multi-stage: a `deps` stage runs `pnpm install --frozen-lockfile`, the
`runner` stage copies `node_modules` + source and starts the process with `pnpm start`
(there is no build step — `tsx` runs the TypeScript directly). Listens on `PORT`
(default `3000`).

```sh
docker build -t api . && docker run -p 3000:3000 --env-file .env api
```

`server.ts` handles `SIGTERM` / `SIGINT`: it stops accepting connections, lets in-flight
requests drain, then exits (hard 10s timeout). `.mise.toml` pins Node 24 / pnpm 11 to
match CI.

For host presets (Fly, Railway, a plain VM) any Node 24 runtime works; set the `Bindings`
from `src/env.ts` as environment variables.

---

# Environment Configuration

For local dev, copy `.env.example` to `.env` and fill in real values — `.env` is gitignored.

Environment variables are typed as the `Bindings` type in `src/env.ts` — that file is the source of truth for what's available, don't duplicate the list here.

Runtime configuration is provided through Hono bindings (`c.env`) and passed explicitly into infrastructure modules (e.g. `db(env)`, `auth(env)`) — never read from `process.env` directly outside `src/env.ts`.

---

# Development Philosophy

This template favors:

- Explicit dependencies
- Small modules
- Clear boundaries
- Production-like tests
- Minimal abstraction

Avoid:

- Business logic inside routes
- Hidden dependencies
- Over-mocking
- Premature abstractions

The goal is to keep the system simple while allowing it to scale as the project grows.
