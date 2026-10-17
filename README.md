# Templates

Backend and backend-adjacent starter templates.

## apps

- [`apps/node-bun-cli/`](apps/node-bun-cli/) — TypeScript CLI package for Node.js, with Bun as its package manager.
- [`apps/node-bun-base/`](apps/node-bun-base/) — Hono API starter running on Node.js, with Bun as its package manager.
- [`apps/python-uv-base/`](apps/python-uv-base/) — FastAPI and Pydantic application managed with uv.

## ml

- [`ml/node-bun-inference/`](ml/node-bun-inference/) — Node.js/Hono CPU ONNX inference with Bun package management.
- [`ml/python-uv-inference/`](ml/python-uv-inference/) — FastAPI CPU ONNX inference managed with uv.

## stack

- [`stack/backend-base/`](stack/backend-base/) — PostgreSQL, Valkey, and SeaweedFS with Docker Compose.

Copy the template closest to your project and adapt it. Code templates use
mise for tools and tasks (`mise run check`, `test`, `dev`, `start`); see each
template's `mise.toml` and `.env.example`. `stack/backend-base` has its own
README.

## Preferred stack

Current defaults for new TypeScript backends:

| Layer          | Choice                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Database       | [libSQL](https://github.com/tursodatabase/libsql) / [Turso](https://turso.tech) (SQLite-compatible; local file in development, Turso when hosted) |
| ORM            | [Drizzle](https://orm.drizzle.team) (`drizzle-orm` + `@libsql/client`, migrations with `drizzle-kit`)                                    |
| HTTP framework | [Hono](https://hono.dev)                                                                                                                |
| Tooling        | [Vite+](https://viteplus.dev) (`vite-plus`: check, format, test)                                                                        |
| TypeScript     | The exact [`tsconfig.json`](apps/node-bun-base/tsconfig.json) from `apps/node-bun-base`, unchanged                                       |

`apps/node-bun-base` already uses Hono, Vite+ and this `tsconfig.json`; the
database layer is not in the templates yet.
