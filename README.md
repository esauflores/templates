# Templates

Backend and backend-adjacent starter templates.

## apps

- [`apps/node-bun-cli/`](apps/node-bun-cli/) — TypeScript CLI package for Node.js, with Bun as its package manager.
- [`apps/node-bun-base/`](apps/node-bun-base/) — Hono API starter running on Node.js, with Bun as its package manager.
- [`apps/bun-fullstack-base/`](apps/bun-fullstack-base/) — Hono API with Zod OpenAPI (`apps/api`), React (Tailwind, shadcn) web app (`apps/web`) and the server that runs them (`server/`) as Bun workspaces: one `Bun.serve` process routing `/api` to the API and everything else to the web app's `index.html`, which Bun bundles itself (hot reload in dev, built ahead of time for production). Vite+ only checks and tests.
- [`apps/python-uv-base/`](apps/python-uv-base/) — FastAPI and Pydantic application managed with uv.

## ml

- [`ml/node-bun-inference/`](ml/node-bun-inference/) — Node.js/Hono CPU ONNX inference with Bun package management.
- [`ml/python-uv-inference/`](ml/python-uv-inference/) — FastAPI CPU ONNX inference managed with uv.
- [`ml/python-uv-training/`](ml/python-uv-training/) — PyTorch training experiments as numbered studies with shared data, evaluation and submission helpers, managed with uv.

## stack

- [`stack/backend-base/`](stack/backend-base/) — PostgreSQL, Valkey, and SeaweedFS with Docker Compose.

Copy the template closest to your project and adapt it. Code templates use
mise for tools and tasks (`mise run check`, `test`, `dev`, `start`); see each
template's `mise.toml` and `.env.example`. `apps/bun-fullstack-base` skips mise
(just Bun and `bun run` scripts), and it and `stack/backend-base` have their own
READMEs.

## Preferred stack

Current defaults for new TypeScript backends:

| Layer           | Choice                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Database        | [libSQL](https://github.com/tursodatabase/libsql) (SQLite-compatible; self-hosted, not Turso Cloud)                                     |
| ORM             | [Drizzle](https://orm.drizzle.team) (`drizzle-orm` + `@libsql/client`, migrations with `drizzle-kit`)                                   |
| HTTP framework  | [Hono](https://hono.dev)                                                                                                                |
| Package manager | [Bun](https://bun.sh) (`bun install`, `bun run <script>`, `bun.lock`); code runs on Node.js 24 via `tsx`; both installed by `mise.toml` |
| Tooling         | [Vite+](https://viteplus.dev) (`vite-plus`: check, format, test)                                                                        |
| TypeScript      | The exact [`tsconfig.json`](apps/node-bun-base/tsconfig.json) from `apps/node-bun-base`, unchanged                                      |
| Scripts         | The exact `scripts` from [`package.json`](apps/node-bun-base/package.json) in `apps/node-bun-base` (below)                              |

```json
"scripts": {
  "check": "vp fmt --check && vp lint && tsc --noEmit",
  "check:fix": "vp fmt && vp lint --fix && tsc --noEmit",
  "test": "vp test",
  "test:watch": "vp test --watch",
  "dev": "tsx watch src/node.ts",
  "start": "tsx src/node.ts"
}
```

`apps/node-bun-base` already uses Hono, Vite+, this `tsconfig.json` and these
scripts; the database layer is not in the templates yet.
