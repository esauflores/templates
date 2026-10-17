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
