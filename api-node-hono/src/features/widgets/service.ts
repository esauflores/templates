// External
import { and, asc, desc, eq, sql } from "drizzle-orm";

// App
import type { Bindings } from "@/env";

// Database
import { type NewWidget, type Widget, widgets } from "@/db/schema";

// Infrastructure
import { db } from "@/infrastructure/db";

// Middleware
import { ApiError } from "@/middleware/errors";

// Library
import type { ListQuery } from "@/lib/query";

type ListOpts = ListQuery & { sort: "createdAt" | "name" };
type CreateInput = Pick<NewWidget, "name" | "description" | "status">;
type UpdateInput = Partial<CreateInput>;

const missing = () => new ApiError(404, "not_found", "Widget not found");

/** A page of the owner's widgets, plus the unpaged total for that owner. */
export const list = async (env: Bindings, ownerId: string, opts: ListOpts) => {
  const where = eq(widgets.ownerId, ownerId);
  const column = opts.sort === "name" ? widgets.name : widgets.createdAt;
  const direction = opts.order === "asc" ? asc : desc;

  const [items, [{ total }]] = await Promise.all([
    db(env).select().from(widgets).where(where).orderBy(direction(column)).limit(opts.limit).offset(opts.offset),
    db(env)
      .select({ total: sql<number>`count(*)::int` })
      .from(widgets)
      .where(where),
  ]);

  return { items, total };
};

export const get = async (env: Bindings, ownerId: string, id: string): Promise<Widget> => {
  const [row] = await db(env)
    .select()
    .from(widgets)
    .where(and(eq(widgets.id, id), eq(widgets.ownerId, ownerId)))
    .limit(1);

  if (!row) throw missing();
  return row;
};

export const create = async (env: Bindings, ownerId: string, input: CreateInput): Promise<Widget> => {
  const [row] = await db(env)
    .insert(widgets)
    .values({ ...input, ownerId })
    .returning();
  return row;
};

export const update = async (env: Bindings, ownerId: string, id: string, input: UpdateInput): Promise<Widget> => {
  const [row] = await db(env)
    .update(widgets)
    .set(input)
    .where(and(eq(widgets.id, id), eq(widgets.ownerId, ownerId)))
    .returning();

  if (!row) throw missing();
  return row;
};

export const remove = async (env: Bindings, ownerId: string, id: string): Promise<void> => {
  const [row] = await db(env)
    .delete(widgets)
    .where(and(eq(widgets.id, id), eq(widgets.ownerId, ownerId)))
    .returning();

  if (!row) throw missing();
};
