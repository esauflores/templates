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
├── infrastructure/
├── middleware/
├── tests/
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
└── markers/
    ├── routes.ts
    ├── service.ts
    └── types.ts
```

Features should not create infrastructure clients directly.

---

### `tests/`

Contains testing utilities.

Structure:

```
tests/
├── fixtures/
└── data/
```

Responsibilities:

- Test database setup
- Authentication fixtures
- Test data generators

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
src/infrastructure/db/neon.ts
```

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

## Fixtures

Fixtures replace production infrastructure.

Example:

```
tests/fixtures/
├── auth.ts
└── db.ts
```

The authentication fixture uses:

- Test database
- Drizzle adapter
- Test secrets

Example:

```ts
vi.mock("@/infrastructure/auth", async () => {
  const { auth } = await import("@/tests/fixtures/auth");

  return { auth };
});
```

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

Environment variables are typed in:

```
src/env.ts
```

Example:

```ts
export type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  EMAILIT_API_KEY: string;
  EMAILIT_FROM: string;
};
```

Runtime configuration is provided through Hono bindings and consumed by infrastructure modules.

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
