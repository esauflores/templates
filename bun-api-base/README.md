# Bun API base

Minimal API starter using Bun and Hono. The app lives in `api/`.

```sh
cd api
bun install
bun run dev
```

- `GET /health` — readiness check
- `GET /api/hello/:name` — JSON greeting example

Set `PORT` to change the default port (`3000`). Run `bun run check` for type checking.
