import { asUser, errorOf, setup } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api } from "@/_generated/api";

const CUST = { name: "Acme", email: "a@acme.test", plan: "pro" as const, status: "active" as const };
const page = { checkpoint: null, limit: 100 };

const insert = (clientId: string) => ({
  newDocumentState: { ...CUST, clientId, updatedAt: 0, _deleted: false },
});

describe("RxDB replication", () => {
  it("pulls local-schema documents once and hides soft-deleted rows from CRUD", async () => {
    const alice = asUser("alice");
    await alice.mutation(api.features.sales.customers.push, { changeRows: [insert("c1")] });
    const first = await alice.query(api.features.sales.customers.pull, page);
    expect(first.documents).toHaveLength(1);
    expect(first.documents[0]).toMatchObject({ clientId: "c1", _deleted: false });
    expect(first.documents[0]).not.toHaveProperty("ownerId");

    const second = await alice.query(api.features.sales.customers.pull, { checkpoint: first.checkpoint, limit: 100 });
    expect(second.documents).toEqual([]);

    const master = first.documents[0]!;
    await alice.mutation(api.features.sales.customers.push, {
      changeRows: [{ newDocumentState: { ...master, _deleted: true }, assumedMasterState: master }],
    });
    expect(await alice.query(api.features.sales.customers.list, {})).toEqual([]);
    expect((await alice.query(api.features.sales.customers.pull, page)).documents[0]).toMatchObject({
      clientId: "c1",
      _deleted: true,
    });
  });

  it("returns the master document instead of letting a stale write overwrite it", async () => {
    const alice = asUser("alice");
    await alice.mutation(api.features.sales.customers.push, { changeRows: [insert("x1")] });
    const master = (await alice.query(api.features.sales.customers.pull, page)).documents[0]!;

    expect(
      await alice.mutation(api.features.sales.customers.push, {
        changeRows: [{ newDocumentState: { ...master, name: "Fresh" }, assumedMasterState: master }],
      }),
    ).toEqual([]);
    const conflict = await alice.mutation(api.features.sales.customers.push, {
      changeRows: [{ newDocumentState: { ...master, _deleted: true }, assumedMasterState: master }],
    });
    expect(conflict).toMatchObject([{ clientId: "x1", name: "Fresh", _deleted: false }]);
    expect((await alice.query(api.features.sales.customers.list, {}))[0]!.name).toBe("Fresh");
  });

  it("pages writes made in the same client millisecond", async () => {
    const alice = asUser("alice");
    await alice.mutation(api.features.sales.customers.push, { changeRows: [insert("a"), insert("b"), insert("c")] });
    const first = await alice.query(api.features.sales.customers.pull, { checkpoint: null, limit: 1 });
    const second = await alice.query(api.features.sales.customers.pull, { checkpoint: first.checkpoint, limit: 1 });
    const third = await alice.query(api.features.sales.customers.pull, { checkpoint: second.checkpoint, limit: 1 });
    expect([first, second, third].flatMap((result) => result.documents.map((doc) => doc.clientId)).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("replication over HTTP", () => {
  it("uses RxDB's direct changeRows payload", async () => {
    const alice = asUser("alice");
    const push = await alice.fetch("/customers/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([insert("h1")]),
    });
    expect(await push.json()).toEqual([]);

    const pulled = (await alice.fetch("/customers/pull?limit=100", {}).then((r) => r.json())) as {
      documents: { clientId: string }[];
    };
    expect(pulled.documents.map((doc) => doc.clientId)).toEqual(["h1"]);
  });

  it("401s an unauthenticated pull and 400s a non-array push body", async () => {
    expect((await setup().fetch("/customers/pull", {})).status).toBe(401);
    const bad = await asUser("alice").fetch("/customers/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changeRows: "nope" }),
    });
    expect(await errorOf(bad)).toEqual({ status: 400, code: "INVALID_ARGUMENT" });
  });
});
