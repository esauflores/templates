---
name: web-api-call
description: Call the API from the React web app with Hono's typed client (api and call in apps/web/src/lib/api.ts) and TanStack Query, show its errors, and test it with mocked fetch. Use when a page or component needs data from /api or sends data to it.
compatibility: Bun 1.4+. Run commands from the repo root. Web tests need Chromium once (bunx playwright install chromium).
---

# Call the API from the web app

The client is typed from the API's routes (`AppType`), so request params and response bodies need no hand-written
types, and a renamed field or param is a type error. If an endpoint doesn't exist yet, add it first (`api-module` or
`api-endpoint` skill).

## The client

`apps/web/src/lib/api.ts` exports:

- `api`: the client. Path segments are properties, params are `[":name"]`, the method is `$get`/`$post`/….
  `api.books[":id"].$get({ param: { id } })` calls `GET /api/books/{id}`.
- `call(request)`: awaits a client call and returns the typed body, or throws `ApiError` (`status`, and `message` from
  the API's `{ error }`) on a non-2xx answer.

| Input       | Client call                                                        |
| ----------- | ------------------------------------------------------------------ |
| Path params | `api.books[":id"].$get({ param: { id: encodeURIComponent(id) } })` |
| Query       | `api.books.$get({ query: { q } })`                                 |
| JSON body   | `api.books.$post({ json: { title } })`                             |

Path params are not URL-encoded by the client: wrap user-supplied values in `encodeURIComponent`.
Never use `fetch` or hand-written URLs for `/api`: they lose the types.

## Reading data

```tsx
const books = useQuery({
  queryKey: ["books", q],
  queryFn: () => call(api.books.$get({ query: { q } })),
});
```

Put every value the request depends on in `queryKey`. Show `books.error.message` when there is an error: it is the
API's own message.

## Changing data

```tsx
const queryClient = useQueryClient();
const addBook = useMutation({
  mutationFn: (title: string) => call(api.books.$post({ json: { title } })),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
});
```

Invalidate the queries the change affects, so lists refetch. Show `addBook.error.message` the same way.

A new page also needs a route in `apps/web/src/main.tsx` (`createBrowserRouter`).

## Tests

In `apps/web/tests/`, mirroring `apps/web/src/` (a page in `src/pages/Books.tsx` is tested in
`tests/pages/books.test.tsx`).
`mockApi` from `tests/support/fetch.ts` replaces `fetch` with handlers keyed by `"METHOD /path"` (no query string),
receives the parsed JSON body, and returns the calls made. Wrap the component in a `QueryClientProvider` with
`createTestQueryClient()` from `tests/support/query.ts` (no retries), and unstub fetch after each test. Keep the
mocked data in a variable the handlers share, so a refetch after a change sees it.

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";

import { Books } from "@web/pages/Books.tsx";

import { mockApi } from "../support/fetch.ts";
import { createTestQueryClient } from "../support/query.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("adds a book", async () => {
  const books = [{ id: "1", title: "Dune" }];
  const calls = mockApi({
    "GET /api/books": () => ({ body: books }),
    "POST /api/books": (body) => {
      const book = { id: String(books.length + 1), ...(body as { title: string }) };
      books.push(book);
      return { status: 201, body: book };
    },
  });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Books />
    </QueryClientProvider>,
  );

  expect(await screen.findByText("Dune")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Emma" } });
  screen.getByRole("button", { name: "Add" }).click();

  expect(await screen.findByText("Emma")).toBeTruthy();
  expect(calls.find((call) => call.key === "POST /api/books")?.body).toEqual({ title: "Emma" });
});
```

Cover the error path too: a handler returning `{ status: 400, body: { error: "…" } }` should put that message on
the screen.

## Verify

```sh
bun run check:fix && bun run check
bun run test
```
