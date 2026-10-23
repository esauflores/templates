import { vi } from "vite-plus/test";

/** A mocked route: gets the request's parsed JSON body, returns the status (200 by default) and body to answer. */
export type Handler = (body: unknown) => { status?: number; statusText?: string; body?: unknown };

/**
 * Replaces fetch with canned API responses keyed by "METHOD /path" (the path without the query string, e.g.
 * "GET /api/hello/world"). Unmocked routes answer 500. Returns the calls made.
 */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { key: string; url: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      const request = input instanceof Request ? input : undefined;
      const url = new URL(
        request?.url ?? (input instanceof URL ? input.href : (input as string)),
        window.location.origin,
      );
      const method = (init.method ?? request?.method ?? "GET").toUpperCase();
      const key = `${method} ${url.pathname}`;
      const raw = typeof init.body === "string" ? init.body : request ? await request.clone().text() : undefined;
      const body = raw ? (JSON.parse(raw) as unknown) : undefined;
      calls.push({ key, url: url.pathname + url.search, body });
      const handler = routes[key];
      if (!handler) return Response.json({ error: `No mock for ${key}` }, { status: 500 });
      const { status = 200, statusText, body: data } = handler(body);
      if (status === 204) return new Response(null, { status, statusText });
      return Response.json(data ?? null, { status, statusText });
    }),
  );
  return calls;
}
