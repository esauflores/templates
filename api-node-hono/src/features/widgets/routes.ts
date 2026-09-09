// External
import { createRoute, z } from "@hono/zod-openapi";

// Database
import type { Widget } from "@/db/schema";

// Library
import { createApp } from "@/lib/app";
import { listQuery, page, pageOf } from "@/lib/query";

// Feature
import * as service from "./service";

// --- Schemas ---------------------------------------------------------------

const WidgetSchema = z
  .object({
    id: z.string().openapi({ example: "b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d" }),
    ownerId: z.string(),
    name: z.string().openapi({ example: "Primary widget" }),
    description: z.string().nullable(),
    status: z.enum(["active", "archived"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Widget");

const CreateWidget = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .openapi("CreateWidget");

const UpdateWidget = CreateWidget.partial()
  .refine((v: Record<string, unknown>) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  })
  .openapi("UpdateWidget");

const IdParam = z.object({
  id: z.string().uuid(),
});

const ListWidgets = listQuery.extend({
  sort: z.enum(["createdAt", "name"]).default("createdAt"),
});

const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  content: { "application/json": { schema } },
});

const serialize = (w: Widget) => ({
  ...w,
  createdAt: w.createdAt.toISOString(),
  updatedAt: w.updatedAt.toISOString(),
});

// --- Routes --------------------------------------------------------------

export const widgets = createApp();

widgets.openapi(
  createRoute({
    method: "get",
    path: "/widgets",
    tags: ["Widgets"],
    summary: "List the caller's widgets",
    request: { query: ListWidgets },
    responses: { 200: { description: "A page of widgets", ...jsonBody(pageOf(WidgetSchema)) } },
  }),
  async (c) => {
    const q = c.req.valid("query");
    const { items, total } = await service.list(c.env, c.get("userId"), q);
    return c.json(page(items.map(serialize), total, q), 200);
  },
);

widgets.openapi(
  createRoute({
    method: "post",
    path: "/widgets",
    tags: ["Widgets"],
    summary: "Create a widget",
    request: { body: jsonBody(CreateWidget) },
    responses: { 201: { description: "The created widget", ...jsonBody(WidgetSchema) } },
  }),
  async (c) => {
    const row = await service.create(c.env, c.get("userId"), c.req.valid("json"));
    return c.json(serialize(row), 201);
  },
);

widgets.openapi(
  createRoute({
    method: "get",
    path: "/widgets/{id}",
    tags: ["Widgets"],
    summary: "Get one widget",
    request: { params: IdParam },
    responses: { 200: { description: "The widget", ...jsonBody(WidgetSchema) } },
  }),
  async (c) => {
    const row = await service.get(c.env, c.get("userId"), c.req.valid("param").id);
    return c.json(serialize(row), 200);
  },
);

widgets.openapi(
  createRoute({
    method: "patch",
    path: "/widgets/{id}",
    tags: ["Widgets"],
    summary: "Update a widget",
    request: { params: IdParam, body: jsonBody(UpdateWidget) },
    responses: { 200: { description: "The updated widget", ...jsonBody(WidgetSchema) } },
  }),
  async (c) => {
    const row = await service.update(c.env, c.get("userId"), c.req.valid("param").id, c.req.valid("json"));
    return c.json(serialize(row), 200);
  },
);

widgets.openapi(
  createRoute({
    method: "delete",
    path: "/widgets/{id}",
    tags: ["Widgets"],
    summary: "Delete a widget",
    request: { params: IdParam },
    responses: { 204: { description: "Deleted" } },
  }),
  async (c) => {
    await service.remove(c.env, c.get("userId"), c.req.valid("param").id);
    return c.body(null, 204);
  },
);
