import { asUser, setup } from "@test/harness";
import { describe, expect, it } from "vitest";

import { api } from "@/_generated/api";

const seed = async (t: ReturnType<typeof setup>, subject: string) => {
  const as = t.withIdentity({ subject });
  const customer = await as.mutation(api.features.sales.customers.create, {
    name: "Acme",
    email: "a@acme.test",
    plan: "pro",
    status: "active",
  });
  const product = await as.mutation(api.features.sales.products.create, {
    name: "Widget",
    sku: "W1",
    priceCents: 500,
    active: true,
  });
  const order = (quantity: number) =>
    as.mutation(api.features.sales.orders.create, {
      customerId: customer._id,
      items: [{ productId: product._id, quantity }],
    });
  return { as, order };
};

describe("order totals (aggregate)", () => {
  it("tracks count and revenue across insert, update and delete", async () => {
    const t = setup();
    const { as, order } = await seed(t, "alice");

    expect(await as.query(api.features.sales.orders.stats, {})).toEqual({ count: 0, totalCents: 0 });

    const first = await order(2); // 1000
    await order(3); // 1500
    expect(await as.query(api.features.sales.orders.stats, {})).toEqual({ count: 2, totalCents: 2500 });

    // A status change doesn't move the money.
    await as.mutation(api.features.sales.orders.update, { id: first._id, status: "paid" });
    expect(await as.query(api.features.sales.orders.stats, {})).toEqual({ count: 2, totalCents: 2500 });

    await as.mutation(api.features.sales.orders.remove, { id: first._id });
    expect(await as.query(api.features.sales.orders.stats, {})).toEqual({ count: 1, totalCents: 1500 });
  });

  it("is namespaced per owner", async () => {
    const t = setup();
    const alice = await seed(t, "alice");
    await alice.order(4); // 2000

    const bob = await seed(t, "bob");
    await bob.order(1); // 500

    expect(await alice.as.query(api.features.sales.orders.stats, {})).toEqual({ count: 1, totalCents: 2000 });
    expect(await bob.as.query(api.features.sales.orders.stats, {})).toEqual({ count: 1, totalCents: 500 });
    // A third user sees an empty tree rather than someone else's numbers.
    expect(await asUser("carol").query(api.features.sales.orders.stats, {})).toEqual({ count: 0, totalCents: 0 });
  });

  it("serves stats over HTTP without colliding with GET /orders/{id}", async () => {
    const t = setup();
    const { as, order } = await seed(t, "alice");
    const placed = await order(2); // 1000

    // The exact route wins over `mountResource`'s `/orders/` prefix...
    expect(await as.fetch("/orders/stats", {}).then((r) => r.json())).toEqual({ count: 1, totalCents: 1000 });
    // ...without shadowing the id lookup it sits alongside.
    expect(await as.fetch(`/orders/${placed._id}`, {}).then((r) => r.json())).toMatchObject({ _id: placed._id });
  });

  it("bounds the total by creation time with `since`", async () => {
    const t = setup();
    const { as, order } = await seed(t, "alice");
    await order(2); // 1000
    const cutoff = Date.now() + 1;
    const recent = await order(3); // 1500

    expect(await as.query(api.features.sales.orders.stats, { since: cutoff })).toEqual({
      count: 1,
      totalCents: 1500,
    });
    expect(await as.query(api.features.sales.orders.stats, { since: recent._creationTime + 1 })).toEqual({
      count: 0,
      totalCents: 0,
    });
  });
});
