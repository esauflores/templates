import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";

/**
 * The page's API, answered in the browser by MSW (never the real server): one handler per endpoint, the way the routes
 * answer it, so a test doesn't need a server, a database or a port. A test overrides one route for its case with
 * `worker.use(http.get(…))`; setup.ts resets them after each test.
 */
export const handlers = [
  http.get("/api/health", () => HttpResponse.json({ ok: true })),
  http.get("/api/hello/:name", ({ params }) => HttpResponse.json({ message: `Hello, ${String(params.name)}!` })),
  /** Anything else answers a 500 { error }, so a missing handler shows on the screen instead of passing silently. */
  http.all("*", ({ request }) => {
    const { pathname } = new URL(request.url);
    return HttpResponse.json({ error: `No handler for ${request.method} ${pathname}` }, { status: 500 });
  }),
];

/** The service worker vite.config.ts serves at /mockServiceWorker.js and setup.ts starts. */
export const worker = setupWorker(...handlers);
