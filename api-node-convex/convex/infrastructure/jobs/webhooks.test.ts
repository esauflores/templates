import { setup } from "@test/harness";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/_generated/api";

type Delivery = { headers: Record<string, string>; body: unknown };

/** Capture outbound `fetch` calls and control what the endpoint answers. */
function stubEndpoint(status: () => number) {
  const deliveries: Delivery[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    deliveries.push({
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string),
    });
    return new Response(null, { status: status() });
  });
  return deliveries;
}

const seedPaidInvoice = async (t: ReturnType<typeof setup>) => {
  const alice = t.withIdentity({ subject: "alice" });
  const customer = await alice.mutation(api.features.sales.customers.create, {
    name: "Acme",
    email: "a@acme.test",
    plan: "pro",
    status: "active",
  });
  const invoice = await alice.mutation(api.features.sales.invoices.create, {
    customerId: customer._id,
    number: "INV-1",
    amountCents: 2500,
  });
  return { alice, invoice };
};

describe("outbound webhook delivery (action + workpool)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OUTBOUND_WEBHOOK_URL", "https://hooks.example.test/convex");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("delivers once when an invoice becomes paid", async () => {
    const deliveries = stubEndpoint(() => 200);
    const t = setup();
    const { alice, invoice } = await seedPaidInvoice(t);

    await alice.mutation(api.features.sales.invoices.update, { id: invoice._id, status: "paid" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]!.body).toMatchObject({
      event: "invoice.paid",
      payload: { invoiceId: invoice._id, number: "INV-1", amountCents: 2500 },
    });
    // The key names the transition, which is what makes a retry safe.
    expect(deliveries[0]!.headers["idempotency-key"]).toBe(`invoice.paid:${invoice._id}`);
  });

  it("does not re-notify when an already-paid invoice is edited", async () => {
    const deliveries = stubEndpoint(() => 200);
    const t = setup();
    const { alice, invoice } = await seedPaidInvoice(t);

    await alice.mutation(api.features.sales.invoices.update, { id: invoice._id, status: "paid" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await alice.mutation(api.features.sales.invoices.update, { id: invoice._id, number: "INV-1-B" });
    await alice.mutation(api.features.sales.invoices.update, { id: invoice._id, status: "paid" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(deliveries).toHaveLength(1);
  });

  it("sends nothing for a status change that isn't paid", async () => {
    const deliveries = stubEndpoint(() => 200);
    const t = setup();
    const { alice, invoice } = await seedPaidInvoice(t);

    await alice.mutation(api.features.sales.invoices.update, { id: invoice._id, status: "sent" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(deliveries).toEqual([]);
  });

  it("retries a failing endpoint, then gives up after the configured attempts", async () => {
    const deliveries = stubEndpoint(() => 500);
    const t = setup();
    const { alice, invoice } = await seedPaidInvoice(t);

    await alice.mutation(api.features.sales.invoices.update, { id: invoice._id, status: "paid" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    // `maxAttempts: 4` in the pool config — the first try plus three retries.
    expect(deliveries).toHaveLength(4);
  });

  it("skips delivery entirely when no endpoint is configured", async () => {
    vi.stubEnv("OUTBOUND_WEBHOOK_URL", "");
    const deliveries = stubEndpoint(() => 200);
    const t = setup();
    const { alice, invoice } = await seedPaidInvoice(t);

    await alice.mutation(api.features.sales.invoices.update, { id: invoice._id, status: "paid" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(deliveries).toEqual([]);
  });
});
