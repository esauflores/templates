// External
import { beforeEach, describe, expect, it } from "vitest";

// App
import { testBindings } from "@/env";
import app from "@/index";

// Test Utilities
import { makeVerifiedUserWithKey } from "@/helpers/test/better-auth";
import { resetDatabase } from "@/helpers/test/pglite";

const req = (path: string, init: RequestInit & { key?: string } = {}) => {
  const { key, headers, ...rest } = init;
  return app.request(
    `/api/v1${path}`,
    {
      ...rest,
      headers: {
        "content-type": "application/json",
        ...(key ? { "x-api-key": key } : {}),
        ...headers,
      },
    },
    testBindings,
  );
};

describe("widgets CRUD", () => {
  let key: string;

  beforeEach(async () => {
    await resetDatabase();
    key = await makeVerifiedUserWithKey("widgets-owner");
  });

  it("rejects an unauthenticated request", async () => {
    const res = await req("/widgets");
    expect(res.status).toBe(401);
  });

  it("creates, reads, lists, updates and deletes a widget", async () => {
    const created = await req("/widgets", {
      method: "POST",
      key,
      body: JSON.stringify({ name: "First widget", description: "hi" }),
    });
    expect(created.status).toBe(201);
    const widget = await created.json();
    expect(widget).toMatchObject({ name: "First widget", status: "active", description: "hi" });
    expect(widget.id).toEqual(expect.any(String));

    const got = await req(`/widgets/${widget.id}`, { key });
    expect(got.status).toBe(200);
    expect(await got.json()).toMatchObject({ id: widget.id });

    const listed = await req("/widgets", { key });
    expect(await listed.json()).toMatchObject({ total: 1, limit: 20, offset: 0, items: [{ id: widget.id }] });

    const updated = await req(`/widgets/${widget.id}`, {
      method: "PATCH",
      key,
      body: JSON.stringify({ name: "Renamed", status: "archived" }),
    });
    expect(await updated.json()).toMatchObject({ name: "Renamed", status: "archived" });

    const deleted = await req(`/widgets/${widget.id}`, { method: "DELETE", key });
    expect(deleted.status).toBe(204);
    expect((await req(`/widgets/${widget.id}`, { key })).status).toBe(404);
  });

  it("returns a normalised 404 for a missing widget", async () => {
    const res = await req(`/widgets/${crypto.randomUUID()}`, { key });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "not_found", message: expect.any(String) });
  });

  it("returns a 422 with field details for an invalid body", async () => {
    const res = await req("/widgets", { method: "POST", key, body: JSON.stringify({ name: "" }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("never returns another owner's widgets", async () => {
    const mine = await req("/widgets", { method: "POST", key, body: JSON.stringify({ name: "mine" }) });
    const { id } = await mine.json();

    const otherKey = await makeVerifiedUserWithKey("other-owner");
    expect((await req(`/widgets/${id}`, { key: otherKey })).status).toBe(404);
    expect(await (await req("/widgets", { key: otherKey })).json()).toMatchObject({ total: 0, items: [] });
  });
});
