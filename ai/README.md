# AI Template

A minimal Hono service for document-grounded chat and retrieval with PDF bounding boxes.

OCR blocks become LangChain `Document`s. Short boxes merge (~32 tokens). Each chunk keeps `[page, left, right, top, bottom]` so a client can highlight the source paragraph.

This is a Node process (`@hono/node-server`), not a Cloudflare worker — ingest writes a JSON index to disk.

---

# Architecture

```
src/
├── features/
│   ├── rag/
│   └── chat/
├── infrastructure/
├── middleware/
├── env.ts
├── index.ts
└── server.ts
```

## Folder Responsibilities

### `features/`

Business modules. `index.ts` mounts their routes. Chat imports `retrieve` from rag — no HTTP between features.

### `features/rag/`

Ingest, chunk, store, retrieve.

```
src/features/rag/
├── chunk.ts      # OCR boxes → LangChain documents
├── store.ts      # in-memory vectors + INDEX_PATH
├── ingest.ts     # POST /ingest
└── retrieval.ts  # POST /retrieval
```

- One box = one document
- Skip header / footer / image / signature
- Merge short boxes on the same page
- Normalize boxes to page-percent coordinates
- Ingest replaces the whole index (one book)

### `features/chat/`

Grounded answer. Calls `features/rag/store.retrieve`, then Mistral.

```
src/features/chat/
├── prompt.ts     # buildChatMessages
└── chat.ts       # POST /chat
```

### `infrastructure/`

External APIs. Application code does not call Mistral directly.

```
src/infrastructure/
├── mistral.ts    # OCR upload + mistral-embed + chat completions
└── openapi.ts    # /doc spec
```

### `middleware/`

```
src/middleware/
├── auth.ts       # optional Bearer API_KEY
└── errors.ts
```

### `src/index.ts`

Composes the app. No business logic.

### `src/server.ts`

Loads `.env`, hydrates the index, listens.

---

# Endpoints

`GET /doc` — OpenAPI JSON. `GET /docs` — Swagger UI.

`GET /healthz` → `{ ok, chunks }`

`POST /ingest` — upload a PDF. Replaces the index.

```json
{ "chunk_count": 2415, "pages": 180 }
```

`POST /retrieval`

```json
{
  "chunks": [
    {
      "id": "c12",
      "content": "…",
      "positions": [[14, 8.2, 91.0, 22.4, 31.1]]
    }
  ]
}
```

`positions` is `[page, left, right, top, bottom]` in % of the page (1-based page).

`POST /chat` — retrieve, then answer from those chunks. Same `chunks` as `/retrieval`.

```json
{
  "answer": "…",
  "chunks": [
    {
      "id": "c12",
      "content": "…",
      "positions": [[14, 8.2, 91.0, 22.4, 31.1]]
    }
  ]
}
```

Empty index → `422` `{ "error": "ingest a PDF first" }`.

---

# Environment

Typed in `src/env.ts`. Copy `.env.example` to `.env`.

| Binding           | Role                                     |
| ----------------- | ---------------------------------------- |
| `MISTRAL_API_KEY` | OCR + embeddings + chat                  |
| `API_KEY`         | Optional Bearer on POST                  |
| `INDEX_PATH`      | JSON index (default `./data/index.json`) |
| `PORT`            | Default `8787`                           |

Runtime config is `c.env` (`Bindings`). `server.ts` injects `bindings()` into `app.fetch`.

`@/` maps to `src/` (`tsconfig` + Vitest + `alias-hook.mjs` for `tsx`). Same-folder imports stay relative.

---

# Testing

Tests do not call Mistral.

- `index.test.ts` — healthz, OpenAPI paths, Bearer 401
- `features/rag/chunk.test.ts` — box merge, skip types, page split
- `features/rag/store.test.ts` — cosine ranking
- `features/rag/retrieval.test.ts` — question required, empty index, ranking
- `features/chat/prompt.test.ts` — chat prompt grounding
- `features/chat/chat.test.ts` — question required, empty index, grounded answer
- `errors.test.ts` — no leaked internals

```
pnpm test
```

---

# Development Philosophy

Same as the api template:

- Explicit dependencies
- Small modules
- Clear boundaries
- Minimal abstraction

Avoid:

- Token-window splitters (they drop boxes)
- Business logic inside `index.ts`
- A second vector database until one JSON file is not enough
