# Web Template

An Astro + React + Tailwind frontend that talks to the [`api`](../api) template via Better Auth. Demonstrates a full sign-in / sign-up / dashboard flow with API key management.

The goal is a server-rendered frontend with React islands for interactive UI, deployable to Cloudflare Pages.

---

# Stack

| Layer          | Choice                                                    |
| -------------- | --------------------------------------------------------- |
| Framework      | Astro 7                                                   |
| Interactive UI | React 19 (islands)                                        |
| Styling        | Tailwind CSS 4                                            |
| Auth           | Better Auth client + React hooks + `apiKey` client plugin |
| Deployment     | Cloudflare Pages (adapter optional, see below)            |

---

# Architecture

```
src/
├── components/      # React islands: Nav, SignInForm, DashboardContent
├── layouts/         # Astro layouts (Base)
├── lib/             # Better Auth client setup
├── pages/           # File-based routes
│   ├── index.astro      # Marketing home
│   ├── sign-in.astro    # Sign in / sign up (React island)
│   └── dashboard.astro  # Session + API key management (React island)
├── styles/          # Global CSS (Tailwind import)
└── env.d.ts         # ImportMetaEnv augmentation
```

## Folder Responsibilities

### `components/`

React components used as Astro islands. Each is hydrated on demand:

- `Nav.tsx` — reactive nav, hides "Dashboard" link when signed out
- `SignInForm.tsx` — combined sign-in / sign-up with toggle
- `DashboardContent.tsx` — session info + API key CRUD

### `layouts/`

Astro layouts that wrap pages with shared chrome (header, nav, footer, base styles).

### `lib/`

Client-side utilities. `auth.ts` exports the Better Auth client (`authClient`) with `signIn`/`signUp`/`signOut`/`useSession` plus the `apiKey` namespace (`authClient.apiKey.{list,create,delete}`).

### `pages/`

File-based routes. `.astro` files are server-rendered. Components marked with `client:load` hydrate on the client.

---

# Environment Configuration

| Var              | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `PUBLIC_API_URL` | Base URL of the `api` template (e.g., `http://localhost:5173`) |

`PUBLIC_` prefix is required for Astro to expose the var to client code.

Copy `.env.example` to `.env` and point `PUBLIC_API_URL` at the running api.

**The api needs `WEB_ORIGIN` set** (in `.dev.vars` or production env) to allow CORS from this web's origin. See the api template's README.

---

# Development

```sh
pnpm install
pnpm dev      # astro dev, default http://localhost:4321
```

Make sure the `api` template is running at the URL set in `PUBLIC_API_URL`.

---

# Pages

## `/` — Marketing home

Static landing page. No interactivity.

## `/sign-in` — Sign in / sign up

A `<SignInForm client:load />` island. Toggle between sign-in and sign-up modes. The mode toggle only adds a "Name" field in sign-up mode.

After successful auth, redirects to `/dashboard`.

## `/dashboard` — Protected

A `<DashboardContent client:load />` island with three sections:

1. **Session** — email, verification warning + resend (if not verified), sign out
2. **API Keys** — create (with 7/30/90-day or no expiry), list (table), delete (with confirm)

Uses `useSession()` for client-side session check. SSR session check via cookies is not used because the browser's cookie jar isn't visible to the SSR fetch — client-side `useSession()` handles this correctly.

---

# Auth Flow

1. User submits sign-in form → `authClient.signIn.email(...)` posts to `{PUBLIC_API_URL}/api/auth/sign-in/email`
2. Better Auth on the api verifies credentials, sets a session cookie scoped to the api's origin
3. Browser redirects to `/dashboard`
4. `useSession()` in the dashboard fetches `{PUBLIC_API_URL}/api/auth/get-session` with cookies (browser handles this)
5. If session exists, dashboard renders; if not, redirects to `/sign-in`

**Cookie sharing in production:** the session cookie is scoped to the api's origin. For the browser to send it on cross-origin requests to the api, configure both:

- api: `API_ORIGIN` (its own URL) + `WEB_ORIGIN` (this web's URL)
- web: `PUBLIC_API_URL` (api's URL)
- Both URLs should share a parent domain (or use the same origin) so the cookie is sent on api requests

---

# Deployment

The Cloudflare adapter is installed as a devDependency but **not enabled by default** in `astro.config.mjs`. The dev server uses Astro's default Node server, which avoids Cloudflare-specific polling (Images/KV binding lookups) that otherwise spams requests in dev.

To deploy to Cloudflare Pages, uncomment the adapter in `astro.config.mjs`:

```js
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  adapter: cloudflare(),
  // ...
});
```

Then:

```sh
pnpm build
pnpm exec wrangler pages deploy ./dist
```

---

# Adding Pages

1. Create a new `.astro` file under `src/pages/`.
2. Wrap the content in the `Base` layout.
3. If the page needs interactivity, import a React component and use `client:load` (or `client:idle` / `client:visible`).
4. If the page is protected, use a client island with `useSession()` to gate access.

Example protected page:

```tsx
// components/ProtectedContent.tsx
import { useSession } from "../lib/auth";

export const ProtectedContent = () => {
  const { data: session, isPending } = useSession();
  if (isPending) return <p>Loading...</p>;
  if (!session) {
    window.location.href = "/sign-in";
    return null;
  }
  return <p>Welcome, {session.user.email}</p>;
};
```

```astro
---
import Base from "../layouts/Base.astro";
import { ProtectedContent } from "../components/ProtectedContent";
---
<Base title="Protected"><ProtectedContent client:load /></Base>
```

---

# Development Philosophy

This template favors:

- Server-rendered pages with React islands for interactivity
- Type-safe integration with the api via Better Auth's client SDK
- Minimal client-side JavaScript (only what the islands need)
- Tailwind for utility-first styling, no global CSS beyond the import

Avoid:

- Client-only routing — Astro's file-based routing handles nav
- Over-hydration — use `client:idle` for below-the-fold interactivity
- Hidden state machines — keep forms simple, use Better Auth's helpers
- SSR auth checks via cookies — the browser's cookie jar isn't visible to SSR fetches; use `useSession()` in client islands instead
