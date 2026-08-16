# API Template

A production-oriented Hono API template focused on clean boundaries, explicit infrastructure, and testability.

The goal is to provide a simple foundation that can grow without unnecessary complexity.

---

# Architecture

The project follows a modular architecture with clear boundaries:

```
src/
├── db/
├── features/
├── helpers/
├── infrastructure/
├── middleware/
├── env.ts
└── index.ts
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
├── auth/   # Authentication providers (Better Auth, OAuth, etc.)
├── db/     # Database clients and ORM configuration (Drizzle + PostgreSQL)
└── email/  # Email providers and delivery services (Emailit, etc.)
```

Responsibilities:

- Authentication providers
- Database clients
- Email providers
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
├── auth.ts
└── errors.ts
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
- Types
- Domain logic

Example:

```
features/
└── widgets/
    ├── routes.ts
    ├── service.ts
    └── types.ts
```

Features should not create infrastructure clients directly.

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

`src/index.ts` composes the application.

Responsibilities:

- Create Hono instance
- Register global middleware
- Register routes
- Configure authentication
- Configure error handling

The entry point should only compose the application and avoid business logic.

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

Authentication is handled using Better Auth.

Production configuration lives in:

```
src/infrastructure/auth/better-auth.ts
```

Responsibilities:

- Email/password authentication
- Email verification
- API key generation
- Database adapter configuration

Protected API routes use:

```
src/middleware/auth.ts
```

Flow:

```
Client
    |
    | X-API-Key
    v
Validate API key
    |
    v
Find owning user
    |
    v
Check email verification
    |
    v
Allow request
```

Only verified users can access:

```
/api/v1/*
```

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

`src/infrastructure/db/index.ts` picks between them based on the `DB_PROVIDER` binding (defaults to `neon`). The same pattern is used for `infrastructure/auth` (`AUTH_PROVIDER`) and `infrastructure/email` (`EMAIL_PROVIDER`).

Schema definitions live in:

```
src/db/
```

The database layer handles:

- Database client creation
- ORM configuration
- Connection management
- Transactions

---

# Middleware

## Authentication Middleware

`requireVerifiedApiKey`

Responsibilities:

- Read API key from request headers
- Validate API key
- Resolve owning user
- Check email verification
- Continue request

---

## Error Middleware

`src/middleware/errors.ts`

Responsibilities:

- Handle Hono exceptions
- Return consistent API responses
- Prevent leaking internal details

Client errors:

```json
{
  "error": "Invalid API Key"
}
```

Internal errors:

```json
{
  "error": "Internal Server Error"
}
```

Internal details are never exposed:

- Database errors
- Stack traces
- Secrets
- Internal URLs

They are logged server-side only.

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

# Error Handling

The API follows a consistent error strategy.

## Client Errors

Examples:

- Missing API key
- Invalid API key
- Unauthorized requests

Response:

```json
{
  "error": "message"
}
```

---

## Server Errors

Internal failures return:

```json
{
  "error": "Internal Server Error"
}
```

The API never exposes:

- Stack traces
- Database errors
- Secrets
- Internal implementation details

---

# Environment Configuration

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
