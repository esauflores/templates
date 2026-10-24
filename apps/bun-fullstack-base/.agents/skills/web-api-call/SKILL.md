---
name: web-api-call
description: Call the API from the React web app with Hono's typed client (api and call in src/web/lib/api.ts) and TanStack Query, show its errors, and test it with mocked fetch. Use when a page or component needs data from /api or sends data to it.
compatibility: Bun 1.4+. Run commands from the repo root. Web tests need Chromium once (bunx playwright install chromium).
---

# Call the API from the web app

The client is typed from the API's routes, so params and bodies need no hand-written types. If an endpoint doesn't
exist yet, add it first (`api-module` or `api-endpoint` skill).

## The client

`src/web/lib/api.ts` exports:

- `api`: one typed client per API module (`api.notes`, `api.hello`, …). Path segments are properties, params are
  `[":name"]`, the method is `$get`/`$post`/…. `api.books[":id"].$get({ param: { id } })` calls `GET /api/books/{id}`.
  A new module needs its line in `api` first: `books: hc<typeof booksRoutes>("/api").books`, with
  `import type { booksRoutes }`.
- `call(request)`: awaits a client call and returns the typed body, or throws `ApiError` (`status`, and `message` from
  the API's `{ error }`) on a non-2xx answer. A `204` (a delete) has no body: it returns `undefined`.

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

A new page also needs a route in `src/web/main.tsx`: a `<Route path="/books" element={<Books />} />` in
`<Routes>`, before the `*` fallback.

## Tests

Next to the code they test: a page in `src/web/pages/Books.tsx` is tested in `src/web/pages/Books.test.tsx`.

The web tests run in headless Chromium with the API mocked in the browser by [MSW](https://mswjs.io): `src/web/mocks.ts`
has one handler per endpoint, `src/web/mocks.setup.ts` starts its service worker (and resets handlers after each test),
and both are wired in `vite.config.ts`. A test that needs another answer overrides a route with `worker.use(…)` — no
server, database or port. The default handlers hold state, so a test that writes updates it and the next request sees it;
they're reset between tests.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vite-plus/test";

import { worker } from "@/web/mocks.ts";
import { Books } from "@/web/pages/Books.tsx";

afterEach(cleanup);

it("adds a book", async () => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Books />
    </QueryClientProvider>,
  );

  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Emma" } });
  screen.getByRole("button", { name: "Add" }).click();

  expect(await screen.findByText("Emma")).toBeTruthy();
});
```

Add the route's handler to `mocks.ts` (that's what a new endpoint costs), and cover the error path with an override:
a handler answering `{ status: 400, body: { error: "…" } }` puts that message on the screen. Anything with no handler at
all answers `500 { error: "No handler for …" }`, so a forgotten mock shows up instead of passing.

## Verify

```sh
bun run check:fix && bun run check
bun run test
```
