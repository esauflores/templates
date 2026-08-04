# Worker Template

A minimal Hono worker for webhooks, edge utilities, and small services.

The goal is a small surface that grows on demand without inheriting the API template's database, auth, or email infrastructure.

---

# Architecture

```
src/
├── infrastructure/
├── middleware/
├── routes/
├── env.ts
└── index.ts
```

## Folder Responsibilities

### `infrastructure/`

External integrations wrapped behind a stable interface.

```
src/infrastructure/
└── webhook/
    └── standardwebhooks.ts
```

Responsibilities:

- Webhook signature verification
- External libraries and services
- Anything that needs a real test secret or side effect

Application code depends on infrastructure modules instead of instantiating external clients directly.

Example:

```ts
import { webhook } from "@/infrastructure/webhook";

// Receiver: verify an incoming webhook
webhook.verify(env, body, headers);

// Sender: sign an outgoing webhook
webhook.sign(env, body); // returns { "webhook-id", "webhook-timestamp", "webhook-signature" }
```

---

### `middleware/`

Reusable HTTP concerns.

```
src/middleware/
└── errors.ts
```

Responsibilities:

- Error handling
- Request lifecycle logic

---

### `routes/`

HTTP route handlers.

```
src/routes/
└── webhook.ts
```

Responsibilities:

- Route definitions
- Request handlers
- Domain-specific logic

Routes depend on middleware and infrastructure modules but not on each other.

---

### `src/index.ts`

Composes the application.

Responsibilities:

- Create Hono instance
- Register error middleware
- Register routes

The entry point should only compose the application and avoid business logic.

---

# Error Handling

`src/middleware/errors.ts` returns consistent responses and prevents leaking internal details.

Client errors:

```json
{
  "error": "message"
}
```

Internal errors:

```json
{
  "error": "Internal Server Error"
}
```

Internal details are never exposed:

- Stack traces
- Secrets
- Internal URLs

They are logged server-side only.

---

# Webhook Example

`src/routes/webhook.ts` shows the canonical worker pattern: receive → verify → respond.

Verification lives in `src/infrastructure/webhook/standardwebhooks.ts` and wraps [`standardwebhooks`](https://github.com/standard-webhooks/standard-webhooks) — the open spec adopted by Svix, Resend, and others. The library handles:

- HMAC-SHA256 signature verification
- Timestamp tolerance window
- Constant-time signature comparison
- Replay protection via `webhook-id`

Mounted at `POST /webhook`. The signing secret comes from `WEBHOOK_SECRET` in `src/env.ts` (use a `whsec_` prefixed base64 string in dev).

## Testing

Test env values live in `.env.test` (committed). `vitest.config.ts` uses Vite's `loadEnv` to inject them at runtime.

Tests call `getTestBindings()` from `src/env.ts`, which reads `import.meta.env.WEBHOOK_SECRET` and returns a `Bindings` object. This centralizes test-env access — no test file touches `import.meta.env` directly.

Tests run against the real `webhook.verify` implementation with the test secret — no `vi.mock`, no fixture, no arg-alignment dance. The test signs with the same secret, the route's production verify path runs unchanged. The `getTestBindings` export is tree-shaken from the production bundle since only tests call it.

---

# Environment Configuration

Environment variables are typed in:

```
src/env.ts
```

Example:

```ts
export type Bindings = {
  WEBHOOK_SECRET: string;
};
```

Runtime configuration is provided through Hono bindings.

---

# Development Philosophy

This template favors:

- Explicit dependencies
- Small modules
- Clear boundaries
- Minimal abstraction

Avoid:

- Business logic inside routes
- Hidden dependencies
- Premature abstractions

The goal is to keep the system simple while allowing it to scale as the project grows.
