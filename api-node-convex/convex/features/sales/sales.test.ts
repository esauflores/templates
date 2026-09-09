import { asUser, errorOf, rejectionCode, setup } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api } from "@/_generated/api";

const makeCustomer = (t: ReturnType<typeof asUser>, over: Record<string, unknown> = {}) =>
  t.mutation(api.features.sales.customers.create, {
    name: "Acme",
    email: "a@acme.test",
    plan: "pro",
    status: "active",
    ...over,
  });

describe("customers (CRUD)", () => {
  it("does full CRUD, scoped to the caller", async () => {
    const alice = asUser("alice");
    const c = await makeCustomer(alice);
    expect(c).toMatchObject({ name: "Acme", plan: "pro", ownerId: "alice" });

    await alice.mutation(api.features.sales.customers.update, { id: c._id, plan: "enterprise" });
    expect((await alice.query(api.features.sales.customers.get, { id: c._id }))?.plan).toBe("enterprise");

    await alice.mutation(api.features.sales.customers.remove, { id: c._id });
    expect(await alice.query(api.features.sales.customers.list, {})).toEqual([]);
  });

  it("isolates owners, reporting another user's row as NOT_FOUND", async () => {
    const c = await makeCustomer(asUser("alice"));
    const bob = asUser("bob");
    expect(await bob.query(api.features.sales.customers.get, { id: c._id })).toBeNull();
    expect(await rejectionCode(bob.mutation(api.features.sales.customers.remove, { id: c._id }))).toBe("NOT_FOUND");
  });

  it("requires authentication", async () => {
    expect(await rejectionCode(setup().query(api.features.sales.customers.list, {}))).toBe("UNAUTHENTICATED");
  });

  // Convex drops `undefined` args before the handler runs, so a partial update
  // can't blank a field it didn't mention — no need to filter the patch object.
  it("leaves fields alone when they're passed as undefined", async () => {
    const alice = asUser("alice");
    const c = await makeCustomer(alice, { company: "Acme Inc" });

    const updated = await alice.mutation(api.features.sales.customers.update, {
      id: c._id,
      name: "Acme 2",
      company: undefined,
    });
    expect(updated).toMatchObject({ name: "Acme 2", company: "Acme Inc" });
  });

  it("pages through results with a cursor", async () => {
    const alice = asUser("alice");
    for (const name of ["one", "two", "three"]) await makeCustomer(alice, { name });

    const first = await alice.query(api.features.sales.customers.paginated, {
      paginationOpts: { cursor: null, numItems: 2 },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);

    const second = await alice.query(api.features.sales.customers.paginated, {
      paginationOpts: { cursor: first.continueCursor, numItems: 2 },
    });
    expect(second.page).toHaveLength(1);
    // No overlap between pages.
    expect(second.page.map((c) => c._id)).not.toContain(first.page[0]!._id);
  });
});

describe("invoices (→ customer)", () => {
  it("rejects invoicing another user's customer", async () => {
    const customer = await makeCustomer(asUser("alice"));
    expect(
      await rejectionCode(
        asUser("bob").mutation(api.features.sales.invoices.create, {
          customerId: customer._id,
          number: "INV-1",
          amountCents: 1000,
        }),
      ),
    ).toBe("NOT_FOUND");
  });

  it("expands the customer on get and defaults status to draft", async () => {
    const alice = asUser("alice");
    const customer = await makeCustomer(alice);
    const invoice = await alice.mutation(api.features.sales.invoices.create, {
      customerId: customer._id,
      number: "INV-1",
      amountCents: 4200,
    });
    expect(await alice.query(api.features.sales.invoices.get, { id: invoice._id })).toMatchObject({
      number: "INV-1",
      status: "draft",
      customer: { name: "Acme" },
    });
  });

  it("returns nothing when filtering by another user's customer, rather than leaking its existence", async () => {
    const alice = asUser("alice");
    const aliceCustomer = await makeCustomer(alice);
    await alice.mutation(api.features.sales.invoices.create, {
      customerId: aliceCustomer._id,
      number: "INV-1",
      amountCents: 100,
    });

    const bob = asUser("bob");
    await makeCustomer(bob, { name: "Bob Co" });
    expect(await bob.query(api.features.sales.invoices.list, { customerId: aliceCustomer._id })).toEqual([]);
  });
});

describe("orders (→ customer + products, computed total)", () => {
  const makeProducts = async (t: ReturnType<typeof asUser>) => ({
    widget: await t.mutation(api.features.sales.products.create, {
      name: "Widget",
      sku: "W1",
      priceCents: 500,
      active: true,
    }),
    gadget: await t.mutation(api.features.sales.products.create, {
      name: "Gadget",
      sku: "G1",
      priceCents: 1200,
      active: true,
    }),
  });

  it("snapshots unit prices and sums the total", async () => {
    const alice = asUser("alice");
    const customer = await makeCustomer(alice);
    const { widget, gadget } = await makeProducts(alice);

    const order = await alice.mutation(api.features.sales.orders.create, {
      customerId: customer._id,
      items: [
        { productId: widget._id, quantity: 3 },
        { productId: gadget._id, quantity: 1 },
      ],
    });
    expect(order).toMatchObject({ totalCents: 3 * 500 + 1200, status: "pending" });

    // A later price change doesn't move a placed order.
    await alice.mutation(api.features.sales.products.update, { id: widget._id, priceCents: 999 });
    expect((await alice.query(api.features.sales.orders.get, { id: order._id }))?.totalCents).toBe(3 * 500 + 1200);
  });

  it("rejects another user's product", async () => {
    const alice = asUser("alice");
    const customer = await makeCustomer(alice);
    const bobProduct = await asUser("bob").mutation(api.features.sales.products.create, {
      name: "P",
      sku: "P1",
      priceCents: 100,
      active: true,
    });
    expect(
      await rejectionCode(
        alice.mutation(api.features.sales.orders.create, {
          customerId: customer._id,
          items: [{ productId: bobProduct._id, quantity: 1 }],
        }),
      ),
    ).toBe("NOT_FOUND");
  });

  it("rejects an empty order and a non-positive quantity", async () => {
    const alice = asUser("alice");
    const customer = await makeCustomer(alice);
    const { widget } = await makeProducts(alice);

    expect(
      await rejectionCode(alice.mutation(api.features.sales.orders.create, { customerId: customer._id, items: [] })),
    ).toBe("INVALID_ARGUMENT");

    expect(
      await rejectionCode(
        alice.mutation(api.features.sales.orders.create, {
          customerId: customer._id,
          items: [{ productId: widget._id, quantity: 0 }],
        }),
      ),
    ).toBe("INVALID_ARGUMENT");
  });
});

describe("REST surface", () => {
  const headers = { "content-type": "application/json" };
  const body = { name: "Acme", email: "a@acme.test", plan: "pro", status: "active" };

  it("does CRUD over HTTP and returns a paginated collection", async () => {
    const alice = asUser("alice");

    const created = await alice.fetch("/customers", { method: "POST", headers, body: JSON.stringify(body) });
    expect(created.status).toBe(201);
    const customer = (await created.json()) as { _id: string };

    const list = await alice.fetch("/customers", {});
    expect(await list.json()).toMatchObject({ items: [{ _id: customer._id }], isDone: true });

    const patched = await alice.fetch(`/customers/${customer._id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ plan: "enterprise" }),
    });
    expect(await patched.json()).toMatchObject({ plan: "enterprise" });

    expect((await alice.fetch(`/customers/${customer._id}`, { method: "DELETE" })).status).toBe(204);
  });

  it("pages over HTTP with ?cursor=", async () => {
    const alice = asUser("alice");
    for (const name of ["one", "two", "three"]) await makeCustomer(alice, { name });

    const first = (await alice.fetch("/customers?limit=2", {}).then((r) => r.json())) as {
      items: unknown[];
      continueCursor: string;
      isDone: boolean;
    };
    expect(first.items).toHaveLength(2);
    expect(first.isDone).toBe(false);

    const second = (await alice
      .fetch(`/customers?limit=2&cursor=${encodeURIComponent(first.continueCursor)}`, {})
      .then((r) => r.json())) as { items: unknown[] };
    expect(second.items).toHaveLength(1);
  });

  it("401s an unauthenticated request", async () => {
    expect(await errorOf(await setup().fetch("/customers", {}))).toEqual({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("400s a malformed id instead of failing with a 500", async () => {
    const { status, code } = await errorOf(await asUser("alice").fetch("/customers/not-an-id", {}));
    expect({ status, code }).toEqual({ status: 400, code: "INVALID_ARGUMENT" });
  });

  it("400s an invalid enum on PATCH instead of a misleading 404", async () => {
    const alice = asUser("alice");
    const customer = await makeCustomer(alice);
    const response = await alice.fetch(`/customers/${customer._id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ plan: "platinum" }),
    });
    expect(await errorOf(response)).toEqual({ status: 400, code: "INVALID_ARGUMENT" });
  });

  it("400s an unparseable body", async () => {
    const response = await asUser("alice").fetch("/customers", { method: "POST", headers, body: "{not json" });
    expect(await errorOf(response)).toEqual({ status: 400, code: "INVALID_ARGUMENT" });
  });

  it("404s a well-formed id that isn't there", async () => {
    const alice = asUser("alice");
    const customer = await makeCustomer(alice);
    await alice.mutation(api.features.sales.customers.remove, { id: customer._id });

    expect(await errorOf(await alice.fetch(`/customers/${customer._id}`, {}))).toEqual({
      status: 404,
      code: "NOT_FOUND",
    });
    expect(await errorOf(await alice.fetch(`/customers/${customer._id}`, { method: "DELETE" }))).toEqual({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
