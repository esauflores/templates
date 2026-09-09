import { asUser, errorOf, setup } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api } from "@/_generated/api";

/**
 * Offline replication for the flat resources — exercised through `customers`,
 * since `products` / `projects` / `tickets` share the same helpers verbatim.
 */

const CUST = { name: "Acme", email: "a@acme.test", plan: "pro" as const, status: "active" as const };
const page = { checkpoint: null, limit: 100 };

describe("replication pull", () => {
  it("returns every owned row once, then nothing until something changes", async () => {
    const alice = asUser("alice");
    await alice.mutation(api.features.sales.customers.create, { ...CUST, clientId: "c1" });
    await alice.mutation(api.features.sales.customers.create, { ...CUST, name: "Beta", clientId: "c2" });

    const first = await alice.query(api.features.sales.customers.pull, page);
    expect(first.documents.map((d) => d.clientId).sort()).toEqual(["c1", "c2"]);
    expect(first.documents.every((d) => d._deleted === false)).toBe(true);
    expect(first.checkpoint).not.toBeNull();

    // Re-pulling from the handed-back checkpoint sees nothing new.
    const second = await alice.query(api.features.sales.customers.pull, { checkpoint: first.checkpoint, limit: 100 });
    expect(second.documents).toEqual([]);
  });

  it("replays a delete as a tombstone", async () => {
    const alice = asUser("alice");
    const row = await alice.mutation(api.features.sales.customers.create, { ...CUST, clientId: "gone" });
    await alice.mutation(api.features.sales.customers.remove, { id: row._id });

    const { documents } = await alice.query(api.features.sales.customers.pull, page);
    expect(documents).toEqual([{ clientId: "gone", updatedAt: expect.any(Number), _deleted: true }]);
    expect(await alice.query(api.features.sales.customers.list, {})).toEqual([]);
  });

  it("is scoped to the caller", async () => {
    await asUser("alice").mutation(api.features.sales.customers.create, { ...CUST, clientId: "a1" });
    expect((await asUser("bob").query(api.features.sales.customers.pull, page)).documents).toEqual([]);
  });
});

describe("replication push", () => {
  const row = (over: Record<string, unknown>) => ({
    newDocumentState: { ...CUST, clientId: "x1", updatedAt: 1_000, _deleted: false, ...over },
  });

  it("inserts an unknown clientId and makes it visible everywhere", async () => {
    const alice = asUser("alice");
    expect(await alice.mutation(api.features.sales.customers.push, { changeRows: [row({})] })).toEqual([]);

    expect((await alice.query(api.features.sales.customers.list, {}))[0]).toMatchObject({
      clientId: "x1",
      name: "Acme",
    });
    expect((await alice.query(api.features.sales.customers.pull, page)).documents[0]).toMatchObject({ clientId: "x1" });
  });

  it("takes a newer write and ignores a stale one (last-write-wins on updatedAt)", async () => {
    const alice = asUser("alice");
    await alice.mutation(api.features.sales.customers.push, { changeRows: [row({ updatedAt: 5_000 })] });

    await alice.mutation(api.features.sales.customers.push, { changeRows: [row({ name: "Stale", updatedAt: 4_000 })] });
    expect((await alice.query(api.features.sales.customers.list, {}))[0]!.name).toBe("Acme");

    await alice.mutation(api.features.sales.customers.push, { changeRows: [row({ name: "Fresh", updatedAt: 9_000 })] });
    expect((await alice.query(api.features.sales.customers.list, {}))[0]!.name).toBe("Fresh");
  });

  it("drops the row and tombstones it on a _deleted push", async () => {
    const alice = asUser("alice");
    await alice.mutation(api.features.sales.customers.push, { changeRows: [row({ updatedAt: 5_000 })] });
    await alice.mutation(api.features.sales.customers.push, {
      changeRows: [row({ _deleted: true, updatedAt: 6_000 })],
    });

    expect(await alice.query(api.features.sales.customers.list, {})).toEqual([]);
    expect((await alice.query(api.features.sales.customers.pull, page)).documents).toEqual([
      { clientId: "x1", updatedAt: expect.any(Number), _deleted: true },
    ]);
  });
});

describe("replication over HTTP", () => {
  it("pulls and pushes through /customers/pull and /customers/push", async () => {
    const alice = asUser("alice");
    const push = await alice.fetch("/customers/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        changeRows: [{ newDocumentState: { ...CUST, clientId: "h1", updatedAt: 1, _deleted: false } }],
      }),
    });
    expect(await push.json()).toEqual([]);

    const pulled = (await alice.fetch("/customers/pull?limit=100", {}).then((r) => r.json())) as {
      documents: { clientId: string }[];
    };
    expect(pulled.documents.map((d) => d.clientId)).toEqual(["h1"]);
  });

  it("401s an unauthenticated pull and 400s a non-array changeRows", async () => {
    expect((await setup().fetch("/customers/pull", {})).status).toBe(401);
    const bad = await asUser("alice").fetch("/customers/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changeRows: "nope" }),
    });
    expect(await errorOf(bad)).toEqual({ status: 400, code: "INVALID_ARGUMENT" });
  });
});
