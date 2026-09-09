import { httpRouter } from "convex/server";
import { Webhook } from "svix";

import { api, internal } from "@/_generated/api";
import type { Id } from "@/_generated/dataModel";
import { httpAction } from "@/_generated/server";
import { invalidArgument, notFound } from "@/infrastructure/lib/errors";
import {
  authed,
  idFromPath,
  json,
  jsonBody,
  jsonPage,
  mountReplication,
  mountResource,
  paginationFrom,
  toErrorResponse,
} from "@/infrastructure/lib/rest";

/**
 * The REST surface (deployed at `https://<deployment>.convex.site`). Send
 * `Authorization: Bearer <Clerk JWT>` — Convex verifies it against the issuer in
 * `auth.config.ts`; the identity propagates into functions called via
 * `ctx.runQuery` / `ctx.runMutation`, which scope every row to the caller.
 *
 * This file is wiring only. The response shaping, error-to-status mapping and
 * the generic CRUD routes live in `infrastructure/lib/rest.ts`.
 *
 * No CORS headers are set: this API is meant for server-to-server callers, and
 * browsers talking to Convex should use a Convex client (which gets live
 * subscriptions) rather than these routes. To call it from a browser anyway, add
 * `Access-Control-Allow-Origin` plus `OPTIONS` routes as shown in
 * https://docs.convex.dev/functions/http-actions#cors.
 */
const http = httpRouter();

mountResource(http, "/customers", api.features.sales.customers);
mountResource(http, "/products", api.features.sales.products);
mountResource(http, "/invoices", api.features.sales.invoices);
mountResource(http, "/orders", api.features.sales.orders);
mountResource(http, "/projects", api.features.workspace.projects);
mountResource(http, "/tickets", api.features.support.tickets);

// Offline sync (RxDB et al.) for the four flat resources — `GET /x/pull`,
// `POST /x/push`. Exact paths, so they win over the `/x/{id}` prefix above.
// `invoices` and `orders` are not replicated — see `infrastructure/replication/`.
mountReplication(http, "/customers", api.features.sales.customers);
mountReplication(http, "/products", api.features.sales.products);
mountReplication(http, "/projects", api.features.workspace.projects);
mountReplication(http, "/tickets", api.features.support.tickets);

// An exact `path` takes precedence over `mountResource`'s `pathPrefix: "/orders/"`,
// so this doesn't get mistaken for `GET /orders/{id}` with an id of "stats".
http.route({
  path: "/orders/stats",
  method: "GET",
  handler: authed(async (ctx, req) => {
    const since = Number(new URL(req.url).searchParams.get("since")) || undefined;
    return json(await ctx.runQuery(api.features.sales.orders.stats, since ? { since } : {}));
  }),
});

// --- assistant threads ------------------------------------------------
// Nested `/threads/{id}/messages` doesn't fit `mountResource`, so these are
// wired by hand.

/**
 * The `{threadId}` from `/threads/{threadId}/messages`, else a 404.
 */
function threadIdFromPath(req: Request): string {
  const [threadId, ...rest] = new URL(req.url).pathname.split("/").filter(Boolean).slice(1);
  if (!threadId || rest.join("/") !== "messages") throw notFound("Not found");
  return threadId;
}

http.route({
  path: "/threads",
  method: "POST",
  handler: authed(async (ctx, req) =>
    json(await ctx.runMutation(api.features.assistant.threads.create, await jsonBody(req)), 201),
  ),
});

http.route({
  pathPrefix: "/threads/",
  method: "POST",
  handler: authed(async (ctx, req) => {
    const threadId = threadIdFromPath(req);
    const { prompt } = await jsonBody(req);
    if (typeof prompt !== "string") throw invalidArgument("prompt must be a string");
    return json(await ctx.runAction(api.features.assistant.messages.ask, { threadId, prompt }));
  }),
});

// --- files, by hand ------------------------------------------------

http.route({
  // Raw upload: POST the bytes with a Content-Type header; `?name=` sets the filename.
  // `contentType` and `size` are not accepted as input — Convex derives them
  // from the stored bytes, and `files.save` reads them back from `_storage`.
  path: "/files",
  method: "POST",
  handler: authed(async (ctx, req) => {
    const storageId = await ctx.storage.store(await req.blob());
    const file = await ctx.runMutation(api.infrastructure.storage.files.save, {
      storageId,
      name: new URL(req.url).searchParams.get("name") ?? "upload",
    });
    return json(file, 201);
  }),
});

http.route({
  path: "/files",
  method: "GET",
  handler: authed(async (ctx, req) =>
    jsonPage(await ctx.runQuery(api.infrastructure.storage.files.paginated, { paginationOpts: paginationFrom(req) })),
  ),
});

http.route({
  pathPrefix: "/files/",
  method: "GET",
  handler: authed(async (ctx, req) => {
    const file = await ctx.runQuery(api.infrastructure.storage.files.get, { id: idFromPath(req) as Id<"files"> });
    if (!file) throw notFound("File not found");
    return json(file);
  }),
});

http.route({
  pathPrefix: "/files/",
  method: "DELETE",
  handler: authed(async (ctx, req) => {
    await ctx.runMutation(api.infrastructure.storage.files.remove, { id: idFromPath(req) as Id<"files"> });
    return new Response(null, { status: 204 });
  }),
});

// --- Clerk → Convex user sync ------------------------------------

type ClerkEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string;
  };
};

http.route({
  // Set this URL as a webhook endpoint in the Clerk dashboard (user events);
  // Svix-signature-verified, so it is NOT wrapped in `authed()`.
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const secret = process.env.CLERK_WEBHOOK_SECRET;
      if (!secret) {
        console.error("CLERK_WEBHOOK_SECRET is not set on this deployment");
        return json({ error: "Webhook not configured", code: "INTERNAL" }, 500);
      }

      let event: ClerkEvent;
      try {
        event = new Webhook(secret).verify(await req.text(), {
          "svix-id": req.headers.get("svix-id") ?? "",
          "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
          "svix-signature": req.headers.get("svix-signature") ?? "",
        }) as unknown as ClerkEvent;
      } catch {
        return json({ error: "Invalid signature", code: "INVALID_ARGUMENT" }, 400);
      }

      if (event.type === "user.created" || event.type === "user.updated") {
        const d = event.data;
        await ctx.runMutation(internal.infrastructure.identity.users.upsertFromClerk, {
          clerkId: d.id,
          email: d.email_addresses?.[0]?.email_address ?? "",
          name: [d.first_name, d.last_name].filter(Boolean).join(" ") || d.id,
          imageUrl: d.image_url,
        });
      } else if (event.type === "user.deleted" && event.data.id) {
        await ctx.runMutation(internal.infrastructure.identity.users.deleteFromClerk, { clerkId: event.data.id });
      }
      return new Response(null, { status: 200 });
    } catch (error) {
      return toErrorResponse(error);
    }
  }),
});

export default http;
