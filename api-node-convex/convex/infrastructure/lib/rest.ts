import type { FunctionReference, HttpRouter } from "convex/server";

import { type ActionCtx, httpAction } from "@/_generated/server";

import { clampLimit } from "./db";
import { type ErrorCode, invalidArgument, isAppError, notFound, unauthenticated } from "./errors";

/**
 * The plumbing behind `convex/http.ts`: response shaping, error mapping and the
 * generic CRUD wiring. `http.ts` itself is then just a list of routes.
 *
 * HTTP actions get no argument validation of their own — parsing the `Request`
 * is entirely up to us — so everything here is written to turn a bad request
 * into a 4xx rather than letting it escape as an uncaught 500.
 */

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_ARGUMENT: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
};

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

/**
 * Convex's own argument validation rejects a malformed id in the path or a
 * mistyped body field. That's the caller's mistake, so it should read as a 400
 * — not the 500 an uncaught throw would produce, nor a misleading 404.
 */
function argumentValidationMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  return /validator error|ArgumentValidationError/i.test(message) ? message : null;
}

/** Map a thrown value onto a status code, leaking nothing we didn't choose to. */
export function toErrorResponse(error: unknown): Response {
  if (isAppError(error)) {
    const { code, message, retryAfterMs } = error.data;
    const response = json({ error: message, code }, STATUS[code]);
    // Tell a throttled caller when to come back instead of leaving it to guess.
    if (retryAfterMs !== undefined) {
      response.headers.set("retry-after", String(Math.ceil(retryAfterMs / 1000)));
    }
    return response;
  }

  const validation = argumentValidationMessage(error);
  if (validation) return json({ error: validation, code: "INVALID_ARGUMENT" satisfies ErrorCode }, 400);

  // Genuinely unexpected: log it for the dashboard, tell the caller nothing.
  console.error("Unhandled error in HTTP action", error);
  return json({ error: "Internal server error", code: "INTERNAL" }, 500);
}

/** Require a verified identity, and turn any thrown error into its status code. */
export const authed = (handler: (ctx: ActionCtx, req: Request) => Promise<Response>) =>
  httpAction(async (ctx, req) => {
    try {
      if (!(await ctx.auth.getUserIdentity())) throw unauthenticated("Authentication required");
      return await handler(ctx, req);
    } catch (error) {
      return toErrorResponse(error);
    }
  });

/** The last path segment — the `{id}` of `/customers/{id}`. */
export const idFromPath = (req: Request): string => new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";

/** Cursor and page size from the query string, for any `paginated` query. */
export const paginationFrom = (req: Request): { cursor: string | null; numItems: number } => {
  const params = new URL(req.url).searchParams;
  return { cursor: params.get("cursor"), numItems: clampLimit(Number(params.get("limit")) || undefined) };
};

/**
 * A page of results, flattened so the response shape is the same whether or not
 * the caller passed a cursor: `{ items, continueCursor, isDone }`.
 */
export const jsonPage = (page: { page: unknown[]; continueCursor: string; isDone: boolean }): Response =>
  json({ items: page.page, continueCursor: page.continueCursor, isDone: page.isDone });

/** Parse a JSON object body, rejecting anything else as a 400. */
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    throw invalidArgument("Request body must be valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw invalidArgument("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

// --- generic CRUD wiring --------------------------------------------

type QueryRef = FunctionReference<"query", "public", any, any>;
type MutationRef = FunctionReference<"mutation", "public", any, any>;

/** The function set every CRUD resource exposes — see `features/sales/customers.ts`. */
export type ResourceRefs = {
  paginated: QueryRef;
  get: QueryRef;
  create: MutationRef;
  update: MutationRef;
  remove: MutationRef;
};

/**
 * Wire `GET`/`POST` `/x` and `GET`/`PATCH`/`DELETE` `/x/{id}` to a resource.
 * The collection route is always paginated — see `jsonPage`.
 */
export function mountResource(http: HttpRouter, path: string, refs: ResourceRefs): void {
  http.route({
    path,
    method: "GET",
    handler: authed(async (ctx, req) =>
      jsonPage(await ctx.runQuery(refs.paginated, { paginationOpts: paginationFrom(req) })),
    ),
  });

  http.route({
    path,
    method: "POST",
    handler: authed(async (ctx, req) => json(await ctx.runMutation(refs.create, await jsonBody(req)), 201)),
  });

  http.route({
    pathPrefix: `${path}/`,
    method: "GET",
    handler: authed(async (ctx, req) => {
      const doc = await ctx.runQuery(refs.get, { id: idFromPath(req) });
      if (!doc) throw notFound("Not found");
      return json(doc);
    }),
  });

  http.route({
    pathPrefix: `${path}/`,
    method: "PATCH",
    handler: authed(async (ctx, req) =>
      // Body spread first so the path id always wins over an `id` in the body.
      json(await ctx.runMutation(refs.update, { ...(await jsonBody(req)), id: idFromPath(req) })),
    ),
  });

  http.route({
    pathPrefix: `${path}/`,
    method: "DELETE",
    handler: authed(async (ctx, req) => {
      await ctx.runMutation(refs.remove, { id: idFromPath(req) });
      return new Response(null, { status: 204 });
    }),
  });
}

// --- offline replication wiring -----------------------------------------

/** The two functions a replicated resource adds — see `infrastructure/replication/`. */
export type ReplicationRefs = { pull: QueryRef; push: MutationRef };

/**
 * Wire `GET {path}/pull` and `POST {path}/push` for an offline-sync client.
 *
 * Both are exact `path` routes, so they win over `mountResource`'s
 * `pathPrefix: "{path}/"` the same way `/orders/stats` does — `pull` and `push`
 * are never mistaken for an `{id}`. Call this *after* `mountResource(path)`.
 *
 *   GET  {path}/pull?updatedAt=&limit=  → { documents, checkpoint }
 *   POST {path}/push   [...]             → conflicts
 */
export function mountReplication(http: HttpRouter, path: string, refs: ReplicationRefs): void {
  http.route({
    path: `${path}/pull`,
    method: "GET",
    handler: authed(async (ctx, req) => {
      const params = new URL(req.url).searchParams;
      const updatedAt = Number(params.get("updatedAt"));
      const checkpoint = Number.isFinite(updatedAt) ? updatedAt : null;
      const limit = clampLimit(Number(params.get("limit")) || undefined);
      return json(await ctx.runQuery(refs.pull, { checkpoint, limit }));
    }),
  });

  http.route({
    path: `${path}/push`,
    method: "POST",
    handler: authed(async (ctx, req) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw invalidArgument("Request body must be valid JSON");
      }
      if (!Array.isArray(body)) throw invalidArgument("Request body must be a changeRows array");
      return json(await ctx.runMutation(refs.push, { changeRows: body }));
    }),
  });
}
